<script setup lang="ts">
import { reactive, ref } from "vue";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const mode = ref<"login" | "register">("login");
const message = ref<string | null>(null);

const form = reactive({
  email: "",
  password: "",
  full_name: "",
});

async function submit() {
  message.value = null;
  try {
    if (mode.value === "login") {
      await auth.login(form.email, form.password);
    } else {
      await auth.register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
      });
      await auth.login(form.email, form.password);
    }
  } catch (e: any) {
    message.value = e.message;
  }
}

function switchMode(m: "login" | "register") {
  mode.value = m;
  message.value = null;
  form.password = "";
}
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="auth-brand">
        <span class="brand-mark">A</span>
        <div>
          <div class="brand-title">АРМ «Платёжный учёт»</div>
          <div class="brand-sub">Авторизация пользователя</div>
        </div>
      </div>

      <div class="tabs">
        <button
          :class="{ active: mode === 'login' }"
          @click="switchMode('login')"
        >
          Вход
        </button>
        <button
          :class="{ active: mode === 'register' }"
          @click="switchMode('register')"
        >
          Регистрация
        </button>
      </div>

      <form class="form" @submit.prevent="submit">
        <label class="field" v-if="mode === 'register'">
          <span>ФИО</span>
          <input v-model="form.full_name" placeholder="Иванов Иван Иванович" />
        </label>

        <label class="field">
          <span>Email</span>
          <input
            v-model="form.email"
            type="email"
            placeholder="user@example.com"
            required
          />
        </label>

        <label class="field">
          <span>Пароль</span>
          <input
            v-model="form.password"
            type="password"
            :placeholder="
              mode === 'register' ? 'минимум 6 символов' : '••••••••'
            "
            required
          />
        </label>

        <button class="btn primary full" type="submit" :disabled="auth.loading">
          {{
            auth.loading
              ? "Подождите…"
              : mode === "login"
                ? "Войти"
                : "Зарегистрироваться"
          }}
        </button>

        <div v-if="message || auth.error" class="error">
          {{ message || auth.error }}
        </div>

        <div v-if="mode === 'login'" class="hint">
          Тестовый доступ: <b>demo@example.com</b> / <b>demo1234</b>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #eceef1;
  padding: 24px;
}
.auth-card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border: 1px solid #d7dbe0;
  padding: 28px 32px 32px;
}
.auth-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e3e6ea;
  margin-bottom: 20px;
}
.brand-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: #2b3138;
  color: #f5f6f7;
  font-weight: 700;
  font-size: 18px;
  border: 1px solid #1c1f23;
}
.brand-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.brand-sub {
  font-size: 12px;
  color: #6a7079;
}

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border: 1px solid #c9cdd3;
  margin-bottom: 22px;
}
.tabs button {
  appearance: none;
  border: none;
  background: #f7f8fa;
  padding: 10px;
  font-family: inherit;
  font-size: 13px;
  color: #4a5058;
  cursor: pointer;
}
.tabs button:first-child {
  border-right: 1px solid #d7dbe0;
}
.tabs button.active {
  background: #2b3138;
  color: #f5f6f7;
  font-weight: 500;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field > span {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6a7079;
}
input {
  font-family: inherit;
  font-size: 13px;
  padding: 10px 12px;
  border: 1px solid #c9cdd3;
  background: #fff;
  color: #1c1f23;
  outline: none;
}
input:focus {
  border-color: #2b3138;
  box-shadow: 0 0 0 2px rgba(43, 49, 56, 0.08);
}
.btn {
  appearance: none;
  font-family: inherit;
  font-size: 13px;
  padding: 11px 18px;
  border: 1px solid #b6bbc2;
  background: #f7f8fa;
  color: #2b3138;
  cursor: pointer;
}
.btn.primary {
  background: #2b3138;
  border-color: #1c1f23;
  color: #f5f6f7;
}
.btn.primary:hover {
  background: #1c1f23;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn.full {
  width: 100%;
}

.error {
  font-size: 12px;
  color: #8a1f1f;
  background: #f7eded;
  border: 1px solid #d3a5a5;
  padding: 8px 10px;
}
.hint {
  font-size: 12px;
  color: #6a7079;
  text-align: center;
  padding-top: 8px;
  border-top: 1px dashed #d7dbe0;
}
</style>
