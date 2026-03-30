<template>
  <div>
    <h2>会话记录</h2>
    <el-form inline>
      <el-form-item label="渠道">
        <el-input v-model="channelId" placeholder="如 web 筛选网页渠道" clearable style="width: 200px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load">查询</el-button>
      </el-form-item>
    </el-form>
    <el-table :data="list" style="margin-top: 16px">
      <el-table-column prop="channelId" label="渠道" width="100" />
      <el-table-column prop="visitorId" label="访客标识" width="260" />
      <el-table-column prop="role" label="角色" width="80">
        <template #default="{ row }">{{ row.role === 'user' ? '用户' : '助手' }}</template>
      </el-table-column>
      <el-table-column prop="content" label="内容" show-overflow-tooltip />
      <el-table-column prop="createdAt" label="时间" width="170">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { api } from '@/api';

interface Msg {
  id: number;
  channelId: string;
  visitorId: string;
  role: string;
  content: string;
  createdAt: string;
}

const list = ref<Msg[]>([]);
const channelId = ref('');

function formatTime(s: string) {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleString('zh-CN');
}

async function load() {
  const params: Record<string, string> = {};
  if (channelId.value) params.channelId = channelId.value;
  params.limit = '100';
  const { data } = await api.get<Msg[]>('/session/messages', { params });
  list.value = data;
}

onMounted(load);
</script>
