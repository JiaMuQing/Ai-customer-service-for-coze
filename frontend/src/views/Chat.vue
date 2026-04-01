<template>
  <div class="chat-standalone">
    <header class="top-bar">
      <div class="top-bar-inner">
        <h1 class="title">在线咨询</h1>
        <p class="subtitle">智能客服 · 随时响应</p>
      </div>
    </header>

    <div class="chat-main">
      <p class="tip">
        与智能助手对话；历史按本浏览器访客保存在服务端，打开页面会加载近期记录。
      </p>
      <div ref="scrollRef" class="messages">
        <div
          v-for="(m, i) in messages"
          :key="i"
          class="msg"
          :class="m.role === 'user' ? 'user' : 'assistant'"
        >
          <span class="role" :class="m.role === 'user' ? 'role-user' : 'role-bot'">{{
            m.role === 'user' ? '我' : '助手'
          }}</span>
          <div
            class="bubble bubble-rich"
            v-html="formatChatBubbleHtml(m.content)"
            @click="onRichImageClick"
          ></div>
        </div>
        <div v-if="loading" class="msg assistant">
          <span class="role role-bot">助手</span>
          <div class="bubble muted loading-bubble" aria-live="polite">
            <span class="loading-dots" aria-hidden="true"
              ><span class="dot" /><span class="dot" /><span class="dot"
            /></span>
            <span class="loading-text">思考中</span>
          </div>
        </div>
        <div ref="bottomAnchor" class="scroll-anchor" aria-hidden="true" />
      </div>
    </div>

    <footer class="input-dock">
      <div class="input-row">
        <el-input
          v-model="input"
          type="textarea"
          :rows="2"
          placeholder="输入消息，Enter 发送（Shift+Enter 换行）"
          @keydown.enter.exact.prevent="send"
        />
        <el-button type="primary" :loading="loading" @click="send">发送</el-button>
      </div>
    </footer>

    <el-dialog
      v-model="previewVisible"
      :title="previewAlt || '图片预览'"
      width="min(96vw, 920px)"
      top="3vh"
      align-center
      append-to-body
      destroy-on-close
      class="chat-img-preview-dialog"
      @closed="onPreviewClosed"
    >
      <div class="img-preview-body">
        <img v-if="previewUrl" :src="previewUrl" :alt="previewAlt" class="img-preview-full" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue';
import { isAxiosError } from 'axios';
import { api } from '@/api';
import { ElMessage } from 'element-plus';
import { formatChatBubbleHtml } from '@/utils/chatBubbleHtml';

/** Coze poll can exceed default 15s axios timeout */
const CHAT_TIMEOUT_MS = 180000;

function formatSendError(e: unknown): string {
  if (isAxiosError(e)) {
    const d = e.response?.data as { message?: string | string[]; error?: string } | undefined;
    if (d?.message !== undefined) {
      return Array.isArray(d.message) ? d.message.join(', ') : String(d.message);
    }
    if (d?.error) return String(d.error);
    if (e.code === 'ECONNABORTED' || e.message?.toLowerCase().includes('timeout')) {
      return '请求超时：智能回复较慢，请稍后再试或联系管理员调大超时时间';
    }
    if (e.message) return e.message;
  }
  if (e instanceof Error && e.message) return e.message;
  return '发送失败';
}

interface Msg {
  role: string;
  content: string;
  createdAt?: string;
}

const messages = ref<Msg[]>([]);
const input = ref('');
const loading = ref(false);
const scrollRef = ref<HTMLElement | null>(null);
const bottomAnchor = ref<HTMLElement | null>(null);

const previewVisible = ref(false);
const previewUrl = ref('');
const previewAlt = ref('');

function onRichImageClick(ev: MouseEvent) {
  const t = ev.target;
  if (!t || !(t instanceof HTMLImageElement)) return;
  if (!t.classList.contains('chat-img')) return;
  ev.preventDefault();
  const src = t.currentSrc || t.src;
  if (!src) return;
  previewUrl.value = src;
  previewAlt.value = t.alt?.trim() || '';
  previewVisible.value = true;
}

function onPreviewClosed() {
  previewUrl.value = '';
  previewAlt.value = '';
}

function scrollToBottomNow() {
  const wrap = scrollRef.value;
  if (wrap) {
    wrap.scrollTop = wrap.scrollHeight;
  }
  bottomAnchor.value?.scrollIntoView({ block: 'end', behavior: 'instant' });
}

/** After DOM / v-html / images; retry so long history + images still end at bottom */
function scrollToBottomAggressive() {
  const run = () => {
    scrollToBottomNow();
  };
  void nextTick().then(run);
  requestAnimationFrame(run);
  setTimeout(run, 0);
  setTimeout(run, 50);
  setTimeout(run, 150);
  setTimeout(run, 400);
  setTimeout(run, 900);
}

async function loadHistory() {
  try {
    const { data } = await api.get<Msg[]>('/chat/history', { params: { limit: 100 } });
    messages.value = Array.isArray(data) ? data : [];
  } catch {
    messages.value = [];
  } finally {
    scrollToBottomAggressive();
  }
}

async function send() {
  const text = input.value.trim();
  if (!text || loading.value) return;
  loading.value = true;
  messages.value.push({ role: 'user', content: text });
  input.value = '';
  scrollToBottomAggressive();
  try {
    const { data } = await api.post<{ reply: string }>(
      '/chat/message',
      { content: text },
      { timeout: CHAT_TIMEOUT_MS },
    );
    messages.value.push({ role: 'assistant', content: data.reply });
  } catch (e: unknown) {
    ElMessage.error(formatSendError(e));
    messages.value.pop();
  } finally {
    loading.value = false;
    scrollToBottomAggressive();
  }
}

watch(messages, () => scrollToBottomAggressive(), { deep: true });

onMounted(() => {
  scrollToBottomAggressive();
  void loadHistory();
});
</script>

<style scoped>
.chat-standalone {
  --chat-primary: #3a7bfd;
  --chat-primary-dark: #2563eb;
  --chat-surface: #ffffff;
  --chat-muted: #909399;
  --chat-text: #303133;
  --chat-radius-lg: 18px;
  --chat-radius-sm: 14px;
  --chat-shadow: 0 4px 24px rgb(15 23 42 / 7%);
  --chat-shadow-bubble: 0 2px 12px rgb(15 23 42 / 6%);

  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family:
    system-ui,
    -apple-system,
    'Segoe UI',
    Roboto,
    'PingFang SC',
    'Microsoft YaHei',
    sans-serif;
  color: var(--chat-text);
  background:
    radial-gradient(1200px 600px at 50% -10%, rgb(58 123 253 / 9%), transparent 55%),
    radial-gradient(800px 400px at 100% 40%, rgb(99 102 241 / 5%), transparent 50%),
    linear-gradient(180deg, #eef2f9 0%, #f7f8fc 45%, #fafbfe 100%);
}

.top-bar {
  flex-shrink: 0;
  padding: 14px 20px 16px;
  background: rgb(255 255 255 / 82%);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgb(228 231 237 / 85%);
  box-shadow: 0 1px 0 rgb(255 255 255 / 80%) inset;
}

.top-bar-inner {
  max-width: 720px;
  margin: 0 auto;
}

.title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #1a1d24;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--chat-muted);
  letter-spacing: 0.04em;
}

.chat-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 14px 20px 10px;
  box-sizing: border-box;
}

.tip {
  flex-shrink: 0;
  margin: 0 0 12px;
  padding: 10px 14px;
  font-size: 12.5px;
  line-height: 1.55;
  color: #606266;
  background: rgb(255 255 255 / 72%);
  border: 1px solid rgb(228 231 237 / 65%);
  border-radius: var(--chat-radius-sm);
  border-left: 3px solid var(--chat-primary);
  box-shadow: var(--chat-shadow-bubble);
}

.messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: var(--chat-radius-lg);
  padding: 16px 14px;
  background-color: #f0f2f8;
  background-image:
    radial-gradient(rgb(148 163 184 / 12%) 1px, transparent 1px);
  background-size: 16px 16px;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 90%),
    0 1px 3px rgb(15 23 42 / 5%);
  scrollbar-width: thin;
  scrollbar-color: rgb(148 163 184 / 45%) transparent;
}

.messages::-webkit-scrollbar {
  width: 7px;
}

.messages::-webkit-scrollbar-thumb {
  background: rgb(148 163 184 / 45%);
  border-radius: 4px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.input-dock {
  flex-shrink: 0;
  width: 100%;
  background: rgb(255 255 255 / 92%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid rgb(228 231 237 / 75%);
  box-shadow: 0 -8px 32px rgb(15 23 42 / 6%);
  padding: 14px 20px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.input-dock .input-row {
  max-width: 720px;
  margin: 0 auto;
}

.msg {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 100%;
}

.msg.user {
  align-items: flex-end;
}

.role {
  display: inline-flex;
  align-items: center;
  margin-bottom: 6px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 999px;
}

.role-bot {
  color: #5c6b8a;
  background: rgb(255 255 255 / 85%);
  border: 1px solid rgb(228 231 237 / 8%);
}

.role-user {
  color: var(--chat-primary-dark);
  background: rgb(58 123 253 / 12%);
  border: 1px solid rgb(58 123 253 / 15%);
}

.bubble {
  max-width: min(88%, 34rem);
  padding: 12px 16px;
  border-radius: var(--chat-radius-sm);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.55;
  font-size: 14.5px;
  transition:
    box-shadow 0.2s ease,
    transform 0.15s ease;
}

.msg.user .bubble {
  color: #fff;
  background: linear-gradient(145deg, #4f8dff 0%, var(--chat-primary) 48%, var(--chat-primary-dark) 100%);
  border-radius: var(--chat-radius-sm) var(--chat-radius-sm) 6px var(--chat-radius-sm);
  box-shadow:
    0 4px 14px rgb(37 99 235 / 28%),
    inset 0 1px 0 rgb(255 255 255 / 18%);
}

.msg.assistant .bubble {
  color: #2c333c;
  background: var(--chat-surface);
  border: 1px solid rgb(228 231 237 / 55%);
  border-radius: var(--chat-radius-sm) var(--chat-radius-sm) var(--chat-radius-sm) 6px;
  box-shadow: var(--chat-shadow-bubble);
}

.bubble-rich {
  white-space: normal;
}

.bubble-rich :deep(p) {
  margin: 6px 0;
  line-height: 1.6;
}

.bubble-rich :deep(p:first-child) {
  margin-top: 0;
}

.bubble-rich :deep(p:last-child) {
  margin-bottom: 0;
}

.bubble-rich :deep(h1),
.bubble-rich :deep(h2),
.bubble-rich :deep(h3) {
  font-weight: 650;
  margin: 10px 0 6px;
  line-height: 1.35;
  color: inherit;
}

.bubble-rich :deep(h1) {
  font-size: 1.12rem;
}

.bubble-rich :deep(h2) {
  font-size: 1.04rem;
}

.bubble-rich :deep(h3) {
  font-size: 0.98rem;
}

.bubble-rich :deep(ul),
.bubble-rich :deep(ol) {
  padding-left: 1.25em;
  margin: 6px 0;
}

.bubble-rich :deep(li) {
  margin: 3px 0;
}

.bubble-rich :deep(pre) {
  background: #f1f4f9;
  padding: 10px 12px;
  border-radius: 10px;
  overflow-x: auto;
  font-size: 0.86em;
  margin: 8px 0;
  border: 1px solid rgb(228 231 237 / 6%);
}

.msg.user .bubble-rich :deep(pre) {
  background: rgb(0 0 0 / 18%);
  border-color: rgb(255 255 255 / 12%);
  color: rgb(255 255 255 / 96%);
}

.bubble-rich :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
}

.bubble-rich :deep(p code),
.bubble-rich :deep(li code) {
  background: #eef1f6;
  padding: 2px 7px;
  border-radius: 5px;
}

.msg.user .bubble-rich :deep(p code),
.msg.user .bubble-rich :deep(li code) {
  background: rgb(255 255 255 / 22%);
  color: #fff;
}

.bubble-rich :deep(blockquote) {
  margin: 8px 0;
  padding: 4px 0 4px 12px;
  border-left: 3px solid #c5ced9;
  color: #5c6370;
}

.msg.user .bubble-rich :deep(blockquote) {
  border-left-color: rgb(255 255 255 / 45%);
  color: rgb(255 255 255 / 88%);
}

.bubble-rich :deep(a) {
  color: var(--chat-primary);
  font-weight: 500;
  word-break: break-all;
  text-underline-offset: 2px;
}

.msg.user .bubble-rich :deep(a) {
  color: #fff;
  text-decoration: underline;
  text-decoration-color: rgb(255 255 255 / 55%);
}

.bubble-rich :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 0.9em;
  border-radius: 8px;
  overflow: hidden;
}

.bubble-rich :deep(th),
.bubble-rich :deep(td) {
  border: 1px solid #e8ecf2;
  padding: 7px 9px;
  text-align: left;
}

.bubble-rich :deep(th) {
  background: #f4f6fa;
  font-weight: 600;
}

.bubble-rich :deep(.chat-img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin-top: 10px;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgb(15 23 42 / 8%);
  cursor: zoom-in;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.bubble-rich :deep(.chat-img:hover) {
  box-shadow: 0 4px 16px rgb(15 23 42 / 12%);
}

.bubble-rich :deep(br + .chat-img) {
  margin-top: 0;
}

.bubble.muted {
  color: #6b7284;
  font-style: normal;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.loading-bubble {
  min-width: 7rem;
}

.loading-text {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.loading-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.loading-dots .dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--chat-primary);
  opacity: 0.35;
  animation: chat-dot 1.1s ease-in-out infinite;
}

.loading-dots .dot:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dots .dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes chat-dot {
  0%,
  80%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  width: 100%;
}

.input-row .el-input {
  flex: 1;
}

.input-row :deep(.el-textarea__inner) {
  border-radius: 14px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.5;
  border: 1px solid #e4e7ed;
  box-shadow: inset 0 1px 2px rgb(15 23 42 / 4%);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.input-row :deep(.el-textarea__inner:hover) {
  border-color: #c6d2e0;
}

.input-row :deep(.el-textarea__inner:focus) {
  border-color: rgb(58 123 253 / 55%);
  box-shadow:
    inset 0 1px 2px rgb(15 23 42 / 4%),
    0 0 0 3px rgb(58 123 253 / 14%);
}

.input-row :deep(.el-button--primary) {
  height: auto;
  min-height: 44px;
  padding: 10px 20px;
  border-radius: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: 0 4px 12px rgb(37 99 235 / 28%);
}

.scroll-anchor {
  width: 100%;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
</style>

<!-- el-dialog teleports to body; keep preview layout unscoped -->
<style>
.chat-img-preview-dialog .el-dialog__body {
  padding-top: 4px;
}

.chat-img-preview-dialog .img-preview-body {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100px;
  overflow: auto;
  max-height: min(85vh, 900px);
}

.chat-img-preview-dialog .img-preview-full {
  max-width: 100%;
  max-height: min(82vh, 860px);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 8px;
}
</style>
