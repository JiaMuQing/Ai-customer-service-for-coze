import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';

export interface CozeChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CozeChatOptions {
  botId: string;
  userId: string;
  query: string;
  conversationId?: string;
  additionalMessages?: CozeChatMessage[];
  stream?: boolean;
}

/** Outer wrapper for most Coze Open API JSON responses */
interface CozeEnvelope<T = unknown> {
  code: number;
  msg?: string;
  data?: T;
}

/** Chat object after create / retrieve (non-stream) */
interface CozeChatState {
  id: string;
  conversation_id: string;
  status?: string;
  answer?: string;
  bot_id?: string;
  last_error?: { code?: number; msg?: string };
}

interface CozeV3Message {
  role?: string;
  type?: string;
  content?: string;
  /** Seconds since epoch (Coze chat message list) */
  created_at?: number;
  /** Model chain-of-thought; never show to end users */
  reasoning_content?: string;
}

export type CozeChatResult = {
  id?: string;
  conversation_id: string;
  answer?: string;
  message_id?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class CozeService {
  private readonly logger = new Logger(CozeService.name);
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.COZE_API_BASE ?? 'https://api.coze.cn';
    const pat = process.env.COZE_PAT ?? '';
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${pat}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /** When COZE_DEBUG=1|true|yes, log request/response bodies to stdout (local troubleshooting). */
  private isCozeDebug(): boolean {
    const v = process.env.COZE_DEBUG?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }

  private pollIntervalMs(): number {
    const n = parseInt(process.env.COZE_POLL_INTERVAL_MS ?? '500', 10);
    return Number.isFinite(n) && n >= 100 ? n : 500;
  }

  private pollTimeoutMs(): number {
    const n = parseInt(process.env.COZE_POLL_TIMEOUT_MS ?? '120000', 10);
    return Number.isFinite(n) && n >= 1000 ? n : 120000;
  }

  /** Build official-style additional_messages (query field alone does not return inline answer). */
  private buildAdditionalMessages(
    query: string,
    additionalMessages?: CozeChatMessage[],
  ): Array<{ role: string; content: string; content_type: string }> {
    const history = (additionalMessages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
      content_type: 'text',
    }));
    return [...history, { role: 'user', content: query, content_type: 'text' }];
  }

  private parseMessageListPayload(envelope: CozeEnvelope): CozeV3Message[] {
    const d = envelope.data;
    if (Array.isArray(d)) return d as CozeV3Message[];
    if (d && typeof d === 'object' && Array.isArray((d as { data?: unknown }).data)) {
      return (d as { data: CozeV3Message[] }).data;
    }
    if (d && typeof d === 'object' && 'messages' in d && Array.isArray((d as { messages: unknown }).messages)) {
      return (d as { messages: CozeV3Message[] }).messages;
    }
    return [];
  }

  /**
   * Remove embedded Coze control payloads (knowledge_recall, generate_answer_finish, etc.)
   * from a single message string. Uses brace matching from {"msg_type" — good enough for API-shaped JSON.
   */
  private stripInternalMsgTypeBlocks(text: string): string {
    const marker = '"msg_type"';
    let out = '';
    let i = 0;
    while (i < text.length) {
      const mi = text.indexOf(marker, i);
      if (mi === -1) {
        out += text.slice(i);
        break;
      }
      const blockStart = text.lastIndexOf('{', mi);
      if (blockStart < i || mi - blockStart > 96) {
        out += text.slice(i, mi + marker.length);
        i = mi + marker.length;
        continue;
      }
      out += text.slice(i, blockStart);
      let depth = 0;
      let j = blockStart;
      for (; j < text.length; j++) {
        const ch = text[j];
        if (ch === '{') depth++;
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      i = j;
      while (i < text.length && (text[i] === '\n' || text[i] === '\r')) i++;
    }
    return out;
  }

  /** Final text for UI: no reasoning, no verbose/tool rows, no embedded JSON control lines */
  private sanitizeAnswerContent(raw: string): string {
    let s = raw.trim();
    s = this.stripInternalMsgTypeBlocks(s);
    s = s.replace(/<think>[\s\S]*?<\/think>/gi, '');
    s = s.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
    s = s.replace(/\n{3,}/g, '\n\n').trim();
    return s;
  }

  /** Coze may emit several assistant `answer` rows per chat (retries / placeholders); do not join them. */
  private isPlaceholderOnlyReply(text: string): boolean {
    const t = text.replace(/[\s\u3000]+/g, '').trim();
    return t === '抱歉，暂时无法回复。' || t === '抱歉，暂时无法回复';
  }

  /**
   * Take a single final reply: chronologically last non-placeholder assistant message.
   * If all are placeholders, return the last sanitized text anyway.
   */
  private extractAssistantAnswer(messages: CozeV3Message[]): string {
    const isAssistant = (m: CozeV3Message) => m.role === 'assistant';

    const answerOnly = messages.filter(
      (m) => isAssistant(m) && m.type === 'answer',
    );
    const noProcess = messages.filter(
      (m) =>
        isAssistant(m) &&
        m.type !== 'verbose' &&
        m.type !== 'function_call' &&
        m.type !== 'tool_output' &&
        m.type !== 'tool_response' &&
        m.type !== 'follow_up',
    );

    const source = answerOnly.length > 0 ? answerOnly : noProcess;

    const sorted = [...source].sort((a, b) => {
      const ta = typeof a.created_at === 'number' ? a.created_at : 0;
      const tb = typeof b.created_at === 'number' ? b.created_at : 0;
      const d = ta - tb;
      if (d !== 0) return d;
      // Stable fallback if no timestamps
      return 0;
    });

    const sanitized: string[] = [];
    for (const m of sorted) {
      const raw = typeof m.content === 'string' ? m.content : '';
      const text = this.sanitizeAnswerContent(raw);
      if (text) sanitized.push(text);
    }

    for (let i = sanitized.length - 1; i >= 0; i--) {
      if (!this.isPlaceholderOnlyReply(sanitized[i])) {
        return sanitized[i].trim();
      }
    }

    return sanitized.length > 0 ? sanitized[sanitized.length - 1].trim() : '';
  }

  private async cancelChat(conversationId: string, chatId: string): Promise<void> {
    try {
      await this.client.post('/v3/chat/cancel', {
        conversation_id: conversationId,
        chat_id: chatId,
      });
    } catch {
      /* best-effort */
    }
  }

  /**
   * Non-stream chat: create → poll retrieve until terminal state → list messages for answer.
   * Aligns with official @coze/api createAndPoll behaviour.
   */
  async chat(options: CozeChatOptions): Promise<CozeChatResult | undefined> {
    const { botId, userId, query, conversationId, additionalMessages, stream = false } = options;

    const additional_messages = this.buildAdditionalMessages(query, additionalMessages);
    const path =
      conversationId != null && String(conversationId).trim() !== ''
        ? `/v3/chat?conversation_id=${encodeURIComponent(String(conversationId).trim())}`
        : '/v3/chat';

    const body: Record<string, unknown> = {
      bot_id: botId,
      user_id: userId,
      stream,
      auto_save_history: true,
      additional_messages,
    };

    if (this.isCozeDebug()) {
      const safe = JSON.stringify({
        ...body,
        additional_messages: additional_messages.map((m) =>
          m.content.length > 300 ? { ...m, content: `${m.content.slice(0, 300)}…` } : m,
        ),
      });
      this.logger.log(`[COZE_DEBUG] POST ${path} body: ${safe}`);
    }

    try {
      const { data: envelope } = await this.client.post<CozeEnvelope<CozeChatState>>(path, body);
      if (this.isCozeDebug()) {
        this.logger.log(`[COZE_DEBUG] Coze create response: ${JSON.stringify(envelope)}`);
      }
      if (envelope.code !== 0) {
        throw new Error(envelope.msg ?? `Coze API error: ${envelope.code}`);
      }

      const created = envelope.data;
      if (!created?.id || !created?.conversation_id) {
        throw new Error('Coze create chat: missing id or conversation_id');
      }
      let chat: CozeChatState = created;

      // Rare synchronous shape (if API ever returns answer inline)
      if (typeof chat.answer === 'string' && chat.answer.trim() !== '') {
        return {
          id: chat.id,
          conversation_id: chat.conversation_id,
          answer: chat.answer,
        };
      }

      const interval = this.pollIntervalMs();
      const timeoutMs = this.pollTimeoutMs();
      const deadline = Date.now() + timeoutMs;

      const terminal = new Set([
        'completed',
        'failed',
        'requires_action',
        'canceled',
        'cancelled',
      ]);

      while (chat.status && !terminal.has(chat.status)) {
        if (Date.now() > deadline) {
          await this.cancelChat(chat.conversation_id, chat.id);
          throw new Error(`Coze chat poll timeout after ${timeoutMs}ms`);
        }
        await sleep(interval);

        const retrieveUrl: string = `/v3/chat/retrieve?conversation_id=${encodeURIComponent(chat.conversation_id)}&chat_id=${encodeURIComponent(chat.id)}`;
        const retrieveRes = await this.client.post<CozeEnvelope<CozeChatState>>(
          retrieveUrl,
          {},
        );
        const ret: CozeEnvelope<CozeChatState> = retrieveRes.data;
        if (this.isCozeDebug()) {
          this.logger.log(`[COZE_DEBUG] Coze retrieve: ${JSON.stringify(ret)}`);
        }
        if (ret.code !== 0) {
          throw new Error(ret.msg ?? `Coze retrieve error: ${ret.code}`);
        }
        if (!ret.data) {
          throw new Error('Coze retrieve: empty data');
        }
        chat = ret.data;
      }

      if (chat.status === 'failed') {
        const msg = chat.last_error?.msg || 'Coze chat failed';
        throw new Error(msg);
      }
      if (chat.status === 'requires_action') {
        throw new Error(
          'Coze chat requires_action (e.g. tool call); submit_tool_outputs not implemented',
        );
      }
      if (chat.status === 'canceled' || chat.status === 'cancelled') {
        throw new Error('Coze chat was canceled');
      }

      const listUrl: string = `/v3/chat/message/list?conversation_id=${encodeURIComponent(chat.conversation_id)}&chat_id=${encodeURIComponent(chat.id)}`;
      const { data: listEnv } = await this.client.get<CozeEnvelope>(listUrl);
      if (this.isCozeDebug()) {
        this.logger.log(`[COZE_DEBUG] Coze message list: ${JSON.stringify(listEnv)}`);
      }
      if (listEnv.code !== 0) {
        throw new Error(listEnv.msg ?? `Coze message list error: ${listEnv.code}`);
      }

      const messages = this.parseMessageListPayload(listEnv);
      const answer = this.extractAssistantAnswer(messages);

      return {
        id: chat.id,
        conversation_id: chat.conversation_id,
        answer: answer || undefined,
      };
    } catch (err) {
      if (this.isCozeDebug() && err instanceof AxiosError) {
        const status = err.response?.status;
        const payload = err.response?.data;
        this.logger.error(
          `[COZE_DEBUG] Coze HTTP error status=${status} body=${JSON.stringify(payload)}`,
        );
      }
      throw err;
    }
  }

  getDefaultBotId(): string {
    const id = process.env.COZE_BOT_ID;
    if (!id) throw new Error('COZE_BOT_ID is not set in .env');
    return id;
  }
}
