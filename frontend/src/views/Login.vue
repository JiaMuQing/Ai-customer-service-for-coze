<template>
  <div class="login-wrap">
    <el-card class="login-card">
      <template #header>后台登录</template>
      <el-form :model="form" label-width="80px" @submit.prevent="onSubmit">
        <el-form-item label="用户名">
          <el-input v-model="form.username" placeholder="固定账号（见 .env ADMIN_USERNAME）" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" placeholder="固定密码（见 .env ADMIN_PASSWORD）" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="onSubmit">登录</el-button>
        </el-form-item>
        <el-alert v-if="error" type="error" :title="error" show-icon style="margin-top: 12px" />
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
const loading = ref(false);
const error = ref('');

const form = reactive({ username: '', password: '' });

async function onSubmit() {
  error.value = '';
  if (!form.username || !form.password) {
    error.value = '请输入用户名和密码';
    return;
  }
  loading.value = true;
  try {
    await auth.login(form.username, form.password);
    await nextTick();
    await router.push('/admin/session');
  } catch (e: unknown) {
    error.value = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f5;
}
.login-card {
  width: 400px;
}
</style>
