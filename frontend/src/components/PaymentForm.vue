<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import { usePaymentsStore } from "../stores/payments";

const store = usePaymentsStore();
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const form = reactive({
  contract_id: 0 as number,
  amount: 0,
  method: "bank" as "bank" | "card" | "cash",
  comment: "",
});

const activeContracts = computed(() =>
  store.contracts.filter((c) => c.status === "active"),
);

const selected = computed(() =>
  store.contracts.find((c) => c.id === form.contract_id),
);

const remaining = computed(() => {
  if (!selected.value) return 0;
  const paid = store.payments
    .filter((p) => p.contract_id === form.contract_id)
    .reduce((s, p) => s + Number(p.amount), 0);
  return Number(selected.value.amount) - paid;
});

const fmt = (n: number) =>
  n.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ₽";

async function submit() {
  error.value = null;
  success.value = null;
  try {
    await store.addPayment({ ...form });
    success.value = `Платёж зарегистрирован: ${fmt(form.amount)}`;
    form.amount = 0;
    form.comment = "";
  } catch (e: any) {
    error.value = e.message ?? "Не удалось сохранить платёж";
  }
}
</script>

<template>
  <section class="head">
    <div>
      <h2 class="title">Регистрация платежа</h2>
      <div class="subtitle">Операция фиксируется в журнале платежей</div>
    </div>
  </section>

  <form class="form" @submit.prevent="submit">
    <div class="form-row">
      <label class="field field-wide">
        <span>Договор</span>
        <select v-model.number="form.contract_id" required>
          <option :value="0" disabled>— выберите договор —</option>
          <option v-for="c in activeContracts" :key="c.id" :value="c.id">
            {{ c.number }} — {{ c.client_name }}
          </option>
        </select>
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
        <span>Способ оплаты</span>
        <select v-model="form.method">
          <option value="bank">Банковский перевод</option>
          <option value="card">Платёжная карта</option>
          <option value="cash">Наличные</option>
        </select>
      </label>

      <label class="field field-wide">
        <span>Комментарий</span>
        <input v-model="form.comment" placeholder="Основание, № п/п и т. п." />
      </label>
    </div>

    <div v-if="selected" class="info">
      <div class="info-item">
        <span class="info-label">Сумма договора</span>
        <span class="info-value">{{ fmt(Number(selected.amount)) }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Остаток к оплате</span>
        <span class="info-value">{{ fmt(remaining) }}</span>
      </div>
    </div>

    <div class="form-actions">
      <button class="btn primary" type="submit">Провести платёж</button>
      <span v-if="error" class="form-error">{{ error }}</span>
      <span v-if="success" class="form-success">{{ success }}</span>
    </div>
  </form>
</template>

<style scoped>
.head {
  padding-bottom: 14px;
  border-bottom: 1px solid #e3e6ea;
  margin-bottom: 22px;
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
}

.form {
  border: 1px solid #d7dbe0;
  background: #f7f8fa;
  padding: 22px 24px;
  max-width: 760px;
}
.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.field-wide {
  grid-column: 1 / -1;
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

.info {
  display: flex;
  gap: 32px;
  margin-top: 20px;
  padding: 14px 16px;
  border: 1px solid #d7dbe0;
  background: #ffffff;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.info-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6a7079;
}
.info-value {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #1c1f23;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}
.form-error {
  font-size: 12px;
  color: #8a1f1f;
  letter-spacing: 0.01em;
}
.form-success {
  font-size: 12px;
  color: #1c4a2a;
  letter-spacing: 0.01em;
}
</style>
