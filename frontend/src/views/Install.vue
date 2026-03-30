<template>
  <div class="install-page">
    <el-card v-if="showRestart" class="card" shadow="hover">
      <template #header>
        <span class="card-title">配置已保存</span>
      </template>
      <p class="lead">
        后端当前仍在「安装模式」，需要<strong>重启一次</strong>后才会加载数据库与聊天功能。
      </p>
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="请在运行后端的终端执行：停止进程（Ctrl+C）后再次执行 npm run start:dev（或 pm2 restart 你的进程名）。"
        style="margin: 16px 0"
      />
      <p v-if="doneMessage" class="muted">{{ doneMessage }}</p>
      <div class="actions">
        <el-button type="primary" @click="onRecheck">我已重启，重新检测</el-button>
      </div>
    </el-card>

    <el-card v-else class="card" shadow="hover">
      <template #header>
        <span class="card-title">初始化安装</span>
      </template>
      <p class="hint">
        检测到尚未完成环境配置。请填写下列项，将写入 <code>backend/.env</code>。请提前在 MySQL
        中创建空库（utf8mb4）。
      </p>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px" label-position="top">
        <el-divider content-position="left">管理员与密钥</el-divider>
        <el-form-item label="后台登录用户名" prop="adminUsername">
          <el-input v-model="form.adminUsername" autocomplete="username" placeholder="例如 admin" />
        </el-form-item>
        <el-form-item label="后台登录密码" prop="adminPassword">
          <el-input
            v-model="form.adminPassword"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="仅保存在本机 .env"
          />
        </el-form-item>
        <el-form-item label="JWT_SECRET" prop="jwtSecret">
          <el-input
            v-model="form.jwtSecret"
            type="password"
            show-password
            placeholder="至少 16 位随机字符串"
          />
        </el-form-item>

        <el-divider content-position="left">MySQL</el-divider>
        <el-form-item label="主机" prop="dbHost">
          <el-input v-model="form.dbHost" placeholder="localhost" />
        </el-form-item>
        <el-form-item label="端口" prop="dbPort">
          <el-input v-model="form.dbPort" placeholder="3306" />
        </el-form-item>
        <el-form-item label="数据库名" prop="dbDatabase">
          <el-input v-model="form.dbDatabase" placeholder="ai_customer_service" />
        </el-form-item>
        <el-form-item label="用户名" prop="dbUsername">
          <el-input v-model="form.dbUsername" placeholder="root" />
        </el-form-item>
        <el-form-item label="密码" prop="dbPassword">
          <el-input
            v-model="form.dbPassword"
            type="password"
            show-password
            placeholder="本地无密码可留空"
          />
        </el-form-item>

        <el-divider content-position="left">扣子 Coze</el-divider>
        <el-form-item label="COZE_PAT" prop="cozePat">
          <el-input v-model="form.cozePat" type="password" show-password placeholder="个人访问令牌" />
        </el-form-item>
        <el-form-item label="COZE_BOT_ID" prop="cozeBotId">
          <el-input v-model="form.cozeBotId" placeholder="Bot ID" />
        </el-form-item>
        <el-form-item label="COZE_API_BASE（可选）" prop="cozeApiBase">
          <el-input v-model="form.cozeApiBase" placeholder="默认 https://api.coze.cn" />
        </el-form-item>

        <el-divider content-position="left">其它（可选）</el-divider>
        <el-form-item label="BASE_URL 公网地址" prop="baseUrl">
          <el-input v-model="form.baseUrl" placeholder="部署后填 https://你的域名，本地可空" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="submit">保存并检测数据库</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { isAxiosError } from 'axios';
import { api } from '@/api';
import { clearInstallStatusCache, getInstallStatus } from '@/utils/installStatus';

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();
const submitting = ref(false);
const doneMessage = ref('');
const needsRestartFlag = ref(false);

const form = reactive({
  adminUsername: 'admin',
  adminPassword: '',
  jwtSecret: '',
  dbHost: 'localhost',
  dbPort: '3306',
  dbDatabase: 'ai_customer_service',
  dbUsername: 'root',
  dbPassword: '',
  cozePat: '',
  cozeBotId: '',
  cozeApiBase: 'https://api.coze.cn',
  baseUrl: '',
});

const rules: FormRules = {
  adminUsername: [{ required: true, message: '必填', trigger: 'blur' }],
  adminPassword: [{ required: true, message: '必填', trigger: 'blur' }],
  jwtSecret: [
    { required: true, message: '必填', trigger: 'blur' },
    { min: 16, message: '至少 16 位', trigger: 'blur' },
  ],
  dbHost: [{ required: true, message: '必填', trigger: 'blur' }],
  dbPort: [{ required: true, message: '必填', trigger: 'blur' }],
  dbDatabase: [{ required: true, message: '必填', trigger: 'blur' }],
  dbUsername: [{ required: true, message: '必填', trigger: 'blur' }],
  cozePat: [{ required: true, message: '必填', trigger: 'blur' }],
  cozeBotId: [{ required: true, message: '必填', trigger: 'blur' }],
};

const showRestart = computed(
  () => route.query.step === 'restart' || needsRestartFlag.value,
);

async function syncRestartState() {
  clearInstallStatusCache();
  const s = await getInstallStatus();
  if (s.needsRestart) {
    needsRestartFlag.value = true;
  }
}

onMounted(async () => {
  if (route.query.step === 'restart') {
    needsRestartFlag.value = true;
  }
  await syncRestartState();
});

function formatApplyError(e: unknown): string {
  if (isAxiosError(e)) {
    const d = e.response?.data as { message?: string | string[] } | undefined;
    if (d?.message !== undefined) {
      return Array.isArray(d.message) ? d.message.join('; ') : d.message;
    }
  }
  if (e instanceof Error) return e.message;
  return '提交失败';
}

async function submit() {
  if (!formRef.value) return;
  await formRef.value.validate().catch(() => Promise.reject());
  submitting.value = true;
  doneMessage.value = '';
  try {
    const { data } = await api.post<{ ok?: boolean; message?: string }>('/install/apply', {
      adminUsername: form.adminUsername.trim(),
      adminPassword: form.adminPassword,
      jwtSecret: form.jwtSecret,
      dbHost: form.dbHost.trim(),
      dbPort: form.dbPort.trim() || '3306',
      dbDatabase: form.dbDatabase.trim(),
      dbUsername: form.dbUsername.trim(),
      dbPassword: form.dbPassword,
      cozePat: form.cozePat.trim(),
      cozeBotId: form.cozeBotId.trim(),
      cozeApiBase: form.cozeApiBase.trim() || undefined,
      baseUrl: form.baseUrl.trim() || undefined,
    });
    if (data?.message) doneMessage.value = data.message;
    ElMessage.success('配置已写入，请按说明重启后端');
    clearInstallStatusCache();
    needsRestartFlag.value = true;
    await router.replace({ path: '/install', query: { step: 'restart' } });
  } catch (e: unknown) {
    ElMessage.error(formatApplyError(e));
  } finally {
    submitting.value = false;
  }
}

async function onRecheck() {
  clearInstallStatusCache();
  const s = await getInstallStatus();
  if (s.configured && !s.needsRestart) {
    needsRestartFlag.value = false;
    ElMessage.success('检测通过，正在进入应用');
    window.location.href = '/';
    return;
  }
  if (s.needsRestart) {
    ElMessage.warning('后端似乎仍未重启，或 .env 未加载。请确认已重启进程。');
    needsRestartFlag.value = true;
  }
}
</script>

<style scoped>
.install-page {
  min-height: 100vh;
  padding: 32px 20px 48px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #eef2f9 0%, #f7f8fc 100%);
}
.card {
  max-width: 640px;
  margin: 0 auto;
  border-radius: 14px;
}
.card-title {
  font-size: 1.1rem;
  font-weight: 650;
}
.hint {
  color: #606266;
  font-size: 14px;
  line-height: 1.55;
  margin: 0 0 20px;
}
.hint code {
  font-size: 0.9em;
  padding: 2px 6px;
  background: #f0f2f5;
  border-radius: 4px;
}
.lead {
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
}
.muted {
  color: #909399;
  font-size: 13px;
  margin-top: 12px;
}
.actions {
  margin-top: 20px;
}
</style>
