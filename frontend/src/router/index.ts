import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { getInstallStatus } from '@/utils/installStatus';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/install',
      name: 'Install',
      meta: { public: true },
      component: () => import('@/views/Install.vue'),
    },
    { path: '/', redirect: '/chat' },
    {
      path: '/chat',
      name: 'Chat',
      meta: { public: true },
      component: () => import('@/views/Chat.vue'),
    },
    { path: '/login', name: 'Login', component: () => import('@/views/Login.vue'), meta: { public: true } },
    // Legacy path when chat lived under the same shell as admin
    { path: '/session', redirect: '/admin/session' },
    {
      path: '/admin',
      component: () => import('@/views/Layout.vue'),
      meta: { requiresAuth: true },
      redirect: '/admin/session',
      children: [
        { path: 'session', name: 'Session', component: () => import('@/views/Session.vue') },
      ],
    },
  ],
});

router.beforeEach(async (to, _from, next) => {
  const status = await getInstallStatus();

  if (to.path === '/install') {
    if (status.configured) {
      next({ path: '/', replace: true });
      return;
    }
    next();
    return;
  }

  if (!status.configured) {
    if (status.needsRestart) {
      next({ path: '/install', query: { step: 'restart' }, replace: true });
      return;
    }
    next({ path: '/install', replace: true });
    return;
  }

  const auth = useAuthStore();
  if (to.meta.public) {
    next();
    return;
  }
  const hasToken = auth.token || localStorage.getItem('token');
  if (to.meta.requiresAuth && !hasToken) {
    next({ name: 'Login' });
    return;
  }
  next();
});

export default router;
