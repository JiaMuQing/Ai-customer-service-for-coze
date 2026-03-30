import { Injectable } from '@nestjs/common';
import { CozeService } from '../coze/coze.service';
import { SessionService } from '../session/session.service';

const WEB_CHANNEL = 'web';

@Injectable()
export class ChatService {
  constructor(
    private readonly coze: CozeService,
    private readonly session: SessionService,
  ) {}

  async sendMessage(username: string, content: string) {
    const botId = this.coze.getDefaultBotId();
    const cozeUserId = `${WEB_CHANNEL}:${username}`;

    const cozeConversationId = await this.session.findLastConversationId(
      WEB_CHANNEL,
      username,
    );
    const recent = await this.session.getRecentMessages(WEB_CHANNEL, username, 10);
    const additionalMessages = recent
      .reverse()
      .slice(-6)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const result = await this.coze.chat({
      botId,
      userId: cozeUserId,
      query: content,
      conversationId: cozeConversationId ?? undefined,
      additionalMessages: additionalMessages.length > 0 ? additionalMessages : undefined,
      stream: false,
    });

    const answer = result?.answer ?? '抱歉，暂时无法回复。';
    const newConvId = result?.conversation_id;

    await this.session.saveMessage({
      channelId: WEB_CHANNEL,
      visitorId: username,
      cozeConversationId: newConvId ?? undefined,
      role: 'user',
      content,
    });
    await this.session.saveMessage({
      channelId: WEB_CHANNEL,
      visitorId: username,
      cozeConversationId: newConvId ?? undefined,
      role: 'assistant',
      content: answer,
    });

    return { reply: answer, conversationId: newConvId };
  }

  async getHistory(username: string, limit: number = 50) {
    const rows = await this.session.getRecentMessages(WEB_CHANNEL, username, limit);
    return rows.reverse().map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
  }
}
