import { defineStore } from "pinia";
import api from "../api/client";
import type { LoginResponse, User } from "../types";

const STORAGE_KEY = "payments.user";

interface State {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuthStore = defineStore("auth", {
  state: (): State => ({
    user: null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (s) => !!s.user,
  },

  actions: {
    init() {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        this.user = JSON.parse(raw);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    },

    async register(payload: {
      email: string;
      password: string;
      full_name: string;
    }) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post<
          Array<{ success: boolean; message: string }>
        >("/rpc/register", {
          p_email: payload.email,
          p_password: payload.password,
          p_full_name: payload.full_name,
        });
        const res = data[0];
        if (!res?.success)
          throw new Error(res?.message ?? "Ошибка регистрации");
        return res.message;
      } catch (e: any) {
        this.error = e?.response?.data?.message ?? e.message ?? "Ошибка";
        throw new Error(this.error ?? "Ошибка");
      } finally {
        this.loading = false;
      }
    },

    async login(email: string, password: string) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post<LoginResponse[]>("/rpc/login", {
          p_email: email,
          p_password: password,
        });
        const r = data[0];
        if (!r?.success)
          throw new Error(r?.message ?? "Неверный email или пароль");
        this.user = {
          id: r.user_id!,
          email: r.user_email!,
          full_name: r.user_name ?? "",
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.user));
        return r;
      } catch (e: any) {
        this.error = e?.response?.data?.message ?? e.message ?? "Ошибка входа";
        throw new Error(this.error ?? "Ошибка");
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.user = null;
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});
