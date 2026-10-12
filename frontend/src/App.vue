<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { usePaymentsStore } from "./stores/payments";
import { useAuthStore } from "./stores/auth";
import AuthScreen from "./components/AuthScreen.vue";
import Dashboard from "./components/Dashboard.vue";
import ContractsList from "./components/ContractsList.vue";
import PaymentForm from "./components/PaymentForm.vue";
import DebtReport from "./components/DebtReport.vue";

const store = usePaymentsStore();
const auth = useAuthStore();

const tab = ref<"dash" | "contracts" | "payment" | "debt">("dash");
const initialLoading = ref(false);

onMounted(() => {
  auth.init();
});

watch(
  () => auth.isAuthenticated,
  async (isAuth) => {
    if (isAuth) {
      initialLoading.value = true;
      await store.loadAll();
      initialLoading.value = false;
    } else {
      store.contracts = [];
      store.payments = [];
      store.debt = [];
    }
  },
  { immediate: true },
);

async function handleLogout() {
  auth.logout();
}
</script>

<template>
  <AuthScreen v-if="!auth.isAuthenticated" />

  <div v-else class="app">
    <header class="header">
      <div class="brand">
        <span class="brand-mark">A</span>
        <div class="brand-text">
          <div class="brand-title">АРМ «Платёжный учёт»</div>
          <div class="brand-sub">
            Автоматизированная система учёта платежей по договорам
          </div>
        </div>
      </div>

      <div class="user-box">
        <div class="user-info">
          <span class="user-email">{{ auth.user?.email }}</span>
        </div>
        <button class="btn" @click="handleLogout">Выйти</button>
      </div>
    </header>

    <nav class="nav">
      <button :class="{ active: tab === 'dash' }" @click="tab = 'dash'">
        Обзор
      </button>
      <button
        :class="{ active: tab === 'contracts' }"
        @click="tab = 'contracts'"
      >
        Договоры
      </button>
      <button :class="{ active: tab === 'payment' }" @click="tab = 'payment'">
        Регистрация платежа
      </button>
      <button :class="{ active: tab === 'debt' }" @click="tab = 'debt'">
        Задолженность
      </button>
    </nav>

    <main class="content">
      <div v-if="initialLoading" class="state">Загрузка данных…</div>
      <div v-else-if="store.error" class="state state-error">
        <span class="state-label">Ошибка соединения с сервером</span>
        <span class="state-detail">{{ store.error }}</span>
      </div>
      <template v-else>
        <Dashboard v-if="tab === 'dash'" />
        <ContractsList v-else-if="tab === 'contracts'" />
        <PaymentForm v-else-if="tab === 'payment'" />
        <DebtReport v-else />
      </template>
    </main>

    <footer class="footer">
      <span>PostgreSQL · PostgREST · Vue 3 · TypeScript</span>
      <span>© 2024 Учёт платежей</span>
    </footer>
  </div>
</template>

<style>
* {
  box-sizing: border-box;
}
html,
body,
#app {
  height: 100%;
}
body {
  margin: 0;
  font-family: "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #1c1f23;
  background: #eceef1;
  -webkit-font-smoothing: antialiased;
}
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 24px 32px;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 22px 0 18px;
  border-bottom: 1px solid #c9cdd3;
  flex-wrap: wrap;
}
.brand {
  display: flex;
  align-items: center;
  gap: 14px;
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

.user-box {
  display: flex;
  align-items: center;
  gap: 14px;
}
.user-email {
  font-size: 13px;
  color: #1c1f23;
}

.nav {
  display: flex;
  gap: 0;
  border: 1px solid #c9cdd3;
  background: #f7f8fa;
  margin-top: 18px;
}
.nav button {
  appearance: none;
  border: none;
  background: transparent;
  padding: 9px 18px;
  font-size: 13px;
  font-family: inherit;
  color: #4a5058;
  cursor: pointer;
  letter-spacing: 0.01em;
  border-right: 1px solid #d7dbe0;
}
.nav button:last-child {
  border-right: none;
}
.nav button:hover {
  background: #e9ebee;
  color: #1c1f23;
}
.nav button.active {
  background: #2b3138;
  color: #f5f6f7;
  font-weight: 500;
}

.content {
  flex: 1;
  background: #ffffff;
  border: 1px solid #d7dbe0;
  padding: 28px 32px;
  margin-top: 20px;
}

.state {
  padding: 40px 0;
  text-align: center;
  color: #6a7079;
  font-size: 13px;
}
.state-error {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #8a1f1f;
}
.state-label {
  font-weight: 600;
}
.state-detail {
  font-size: 12px;
  color: #a44;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #e3e6ea;
  vertical-align: middle;
}
th {
  background: #f4f5f7;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #4a5058;
  border-bottom: 1px solid #c9cdd3;
}
tbody tr:hover {
  background: #fafbfc;
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.btn {
  appearance: none;
  font-family: inherit;
  font-size: 13px;
  padding: 9px 18px;
  border: 1px solid #b6bbc2;
  background: #f7f8fa;
  color: #2b3138;
  cursor: pointer;
  letter-spacing: 0.02em;
}
.btn:hover {
  background: #eceef1;
}
.btn.primary {
  background: #2b3138;
  border-color: #1c1f23;
  color: #f5f6f7;
}
.btn.primary:hover {
  background: #1c1f23;
}

input,
select,
textarea {
  font-family: inherit;
  font-size: 13px;
  padding: 9px 11px;
  border: 1px solid #c9cdd3;
  background: #ffffff;
  color: #1c1f23;
  border-radius: 0;
  outline: none;
}
input:focus,
select:focus,
textarea:focus {
  border-color: #2b3138;
  box-shadow: 0 0 0 2px rgba(43, 49, 56, 0.08);
}
.footer {
  display: flex;
  justify-content: space-between;
  padding-top: 16px;
  margin-top: 20px;
  border-top: 1px solid #c9cdd3;
  font-size: 12px;
  color: #6a7079;
  letter-spacing: 0.02em;
}
</style>
