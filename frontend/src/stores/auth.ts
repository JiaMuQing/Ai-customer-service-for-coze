import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'));

  async function login(username: string, password: string) {
    const res = await api.post<{ access_token: string }>('/auth/login', { username, password });
    const t = res.data.access_token;
    token.value = t;
    localStorage.setItem('token', t);
    return t;
  }

  function logout() {
    token.value = null;
    localStorage.removeItem('token');
  }

  return { token, login, logout };
});
