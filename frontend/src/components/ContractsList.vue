<script setup lang="ts">
import { reactive, ref } from "vue";
import { usePaymentsStore } from "../stores/payments";

const store = usePaymentsStore();
const showForm = ref(false);
const error = ref<string | null>(null);

const form = reactive({
  number: "",
  client_name: "",
  amount: 0,
  signed_date: new Date().toISOString().slice(0, 10),
});

const fmt = (n: number) =>
  n.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ₽";

async function submit() {
  error.value = null;
  try {
    await store.addContract({ ...form });
    showForm.value = false;
    form.number = "";
    form.client_name = "";
    form.amount = 0;
  } catch (e: any) {
    error.value = e.message;
  }
}
</script>

<template>
  <section class="head">
    <div>
      <h2 class="title">Реестр договоров</h2>
      <div class="subtitle">Всего записей: {{ store.contracts.length }}</div>
    </div>
    <button class="btn" @click="showForm = !showForm">
      {{ showForm ? "Отменить" : "Добавить договор" }}
    </button>
  </section>

  <form v-if="showForm" class="form" @submit.prevent="submit">
    <div class="form-row">
      <label class="field">
        <span>Номер договора</span>
        <input v-model="form.number" placeholder="Д-2024-XXX" required />
      </label>
      <label class="field">
        <span>Клиент</span>
        <input v-model="form.client_name" placeholder="Наименование" required />
      </label>
      <label class="field">
        <span>Сумма, ₽</span>
        <input
          v-model.number="form.amount"
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </label>
      <label class="field">
        <span>Дата подписания</span>
        <input v-model="form.signed_date" type="date" required />
      </label>
    </div>
    <div class="form-actions">
      <button class="btn primary" type="submit">Сохранить</button>
      <span v-if="error" class="form-error">{{ error }}</span>
    </div>
  </form>

  <table>
    <thead>
      <tr>
        <th style="width: 140px">№ договора</th>
        <th>Клиент</th>
        <th class="num" style="width: 160px">Сумма</th>
        <th style="width: 140px">Дата</th>
        <th style="width: 120px">Статус</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="c in store.contracts" :key="c.id">
        <td class="mono">{{ c.number }}</td>
        <td>{{ c.client_name }}</td>
        <td class="num">{{ fmt(Number(c.amount)) }}</td>
        <td>{{ new Date(c.signed_date).toLocaleDateString("ru-RU") }}</td>
        <td>
          <span :class="['badge', c.status]">{{ c.status }}</span>
        </td>
      </tr>
      <tr v-if="!store.contracts.length">
        <td colspan="5" class="empty">Договоры не найдены</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e3e6ea;
  margin-bottom: 20px;
}
.title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.subtitle {
  font-size: 12px;
  color: #6a7079;
  letter-spacing: 0.02em;
}

.form {
  border: 1px solid #d7dbe0;
  background: #f7f8fa;
  padding: 18px 20px;
  margin-bottom: 22px;
}
.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
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
.form-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}
.form-error {
  font-size: 12px;
  color: #8a1f1f;
  letter-spacing: 0.01em;
}

.mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: 1px solid;
}
.badge.active {
  color: #1c4a2a;
  border-color: #9ab8a3;
  background: #eef5f0;
}
.badge.closed {
  color: #4a5058;
  border-color: #c9cdd3;
  background: #f0f1f3;
}
.badge.cancelled {
  color: #8a1f1f;
  border-color: #d3a5a5;
  background: #f7eded;
}

.empty {
  text-align: center;
  color: #6a7079;
  padding: 24px 0;
  font-size: 12px;
}
</style>
