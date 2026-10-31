<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import { usePaymentsStore } from "../stores/payments";
import type { Contract } from "../types";

const store = usePaymentsStore();
const showForm = ref(false);
const error = ref<string | null>(null);

const selectedContract = ref<Contract | null>(null);
const isClosing = ref(false);

const form = reactive({
  client_name: "",
  amount: 0,
  signed_date: new Date().toISOString().slice(0, 10),
});

const currentPage = ref(1);
const pageSize = 10;

const totalPages = computed(() => {
  return Math.ceil(store.contracts.length / pageSize) || 1;
});

const paginatedContracts = computed(() => {
  const start = (currentPage.value - 1) * pageSize;
  const end = start + pageSize;
  return store.contracts.slice(start, end);
});

function prevPage() {
  if (currentPage.value > 1) currentPage.value--;
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++;
}

const fmt = (n: number) =>
  n.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ₽";

async function submit() {
  error.value = null;
  try {
    await store.addContract({
      client_name: form.client_name,
      amount: form.amount,
      signed_date: form.signed_date,
    });
    showForm.value = false;
    form.client_name = "";
    form.amount = 0;
    currentPage.value = 1;
  } catch (e: any) {
    error.value = e.message;
  }
}

const contractPayments = computed(() => {
  if (!selectedContract.value) return [];
  return store.payments.filter(
    (p) => p.contract_id === selectedContract.value?.id,
  );
});

const paidTotal = computed(() => {
  return contractPayments.value.reduce((s, p) => s + Number(p.amount), 0);
});

const remaining = computed(() => {
  if (!selectedContract.value) return 0;
  return Number(selectedContract.value.amount) - paidTotal.value;
});

async function handleCloseContract() {
  if (!selectedContract.value) return;

  if (remaining.value > 0) {
    alert(
      `Невозможно закрыть договор. Остаток к оплате: ${fmt(remaining.value)}. Сначала погасите задолженность.`,
    );
    return;
  }

  if (!confirm("Вы уверены, что хотите закрыть этот договор?")) return;

  isClosing.value = true;
  try {
    await store.closeContract(selectedContract.value.id);
    selectedContract.value.status = "closed";
  } catch (e: any) {
    alert(e.message);
  } finally {
    isClosing.value = false;
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
        <span>Клиент</span>
        <input
          v-model="form.client_name"
          placeholder="ООО Ромашка, ИП Иванов..."
          required
        />
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
      <span class="hint">Номер договора будет присвоен автоматически</span>
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
        <th style="width: 100px; text-align: center">Действия</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="c in paginatedContracts" :key="c.id">
        <td class="mono">{{ c.number }}</td>
        <td>{{ c.client_name }}</td>
        <td class="num">{{ fmt(Number(c.amount)) }}</td>
        <td>{{ new Date(c.signed_date).toLocaleDateString("ru-RU") }}</td>
        <td>
          <span :class="['badge', c.status]">{{ c.status }}</span>
        </td>
        <td style="text-align: center">
          <button class="btn-sm" @click="selectedContract = c">Детали</button>
        </td>
      </tr>
      <tr v-if="!store.contracts.length">
        <td colspan="6" class="empty">Договоры не найдены</td>
      </tr>
    </tbody>
  </table>

  <div v-if="totalPages > 1" class="pagination">
    <button class="btn" :disabled="currentPage === 1" @click="prevPage">
      ← Назад
    </button>
    <span class="page-info"
      >Страница {{ currentPage }} из {{ totalPages }}</span
    >
    <button
      class="btn"
      :disabled="currentPage === totalPages"
      @click="nextPage"
    >
      Вперед →
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="selectedContract"
      class="modal-backdrop"
      @click.self="selectedContract = null"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>Договор {{ selectedContract.number }}</h3>
          <button class="close-btn" @click="selectedContract = null">×</button>
        </div>

        <div class="modal-body">
          <div class="detail-row">
            <span class="label">Клиент:</span>
            <span class="value">{{ selectedContract.client_name }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Дата подписания:</span>
            <span class="value">{{
              new Date(selectedContract.signed_date).toLocaleDateString("ru-RU")
            }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Сумма договора:</span>
            <span class="value">{{
              fmt(Number(selectedContract.amount))
            }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Статус:</span>
            <span :class="['badge', selectedContract.status]">{{
              selectedContract.status
            }}</span>
          </div>

          <div class="divider"></div>

          <h4>История платежей</h4>
          <div v-if="contractPayments.length" class="payments-list">
            <div v-for="p in contractPayments" :key="p.id" class="payment-item">
              <div class="p-left">
                <span class="p-date">{{
                  new Date(p.paid_at).toLocaleString("ru-RU")
                }}</span>
                <span class="p-method">{{ p.method }}</span>
              </div>
              <div class="p-right">
                <span class="p-amount">{{ fmt(Number(p.amount)) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-small">Платежей пока нет</div>

          <div class="summary">
            <div class="detail-row">
              <span class="label">Оплачено:</span>
              <span class="value">{{ fmt(paidTotal) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Остаток:</span>
              <span class="value" :class="{ 'text-red': remaining > 0 }">{{
                fmt(remaining)
              }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="selectedContract.status === 'active'"
            class="btn primary"
            style="background: #8a1f1f; border-color: #8a1f1f"
            :disabled="isClosing || remaining > 0"
            :title="remaining > 0 ? 'Сначала погасите задолженность' : ''"
            @click="handleCloseContract"
          >
            {{ isClosing ? "Закрываем…" : "Закрыть договор" }}
          </button>
          <div v-else></div>

          <button class="btn" @click="selectedContract = null">
            Закрыть окно
          </button>
        </div>
      </div>
    </div>
  </Teleport>
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
.hint {
  font-size: 12px;
  color: #6a7079;
  font-style: italic;
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

.btn-sm {
  font-family: inherit;
  font-size: 12px;
  padding: 4px 10px;
  background: #ffffff;
  border: 1px solid #c9cdd3;
  color: #2b3138;
  cursor: pointer;
}
.btn-sm:hover {
  background: #f0f1f3;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 24px;
}
.page-info {
  font-size: 13px;
  color: #4a5058;
  font-weight: 500;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(28, 31, 35, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: #ffffff;
  width: 100%;
  max-width: 600px;
  border: 1px solid #2b3138;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  font-family: "Inter", "Segoe UI", sans-serif;
  font-size: 13px;
  color: #1c1f23;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #d7dbe0;
  background: #f4f5f7;
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #6a7079;
  cursor: pointer;
}
.close-btn:hover {
  color: #1c1f23;
}
.modal-body {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}
.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.detail-row .label {
  color: #6a7079;
}
.detail-row .value {
  font-weight: 500;
  text-align: right;
}
.divider {
  height: 1px;
  background: #e3e6ea;
  margin: 20px 0;
}
.modal-body h4 {
  margin: 0 0 12px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #4a5058;
}

.payments-list {
  border: 1px solid #e3e6ea;
}
.payment-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #e3e6ea;
}
.payment-item:last-child {
  border-bottom: none;
}
.p-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.p-date {
  font-weight: 500;
}
.p-method {
  font-size: 11px;
  text-transform: uppercase;
  color: #6a7079;
}
.p-amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.empty-small {
  color: #6a7079;
  font-style: italic;
  text-align: center;
  padding: 16px;
  background: #f9fafb;
  border: 1px dashed #d7dbe0;
}
.summary {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e3e6ea;
}
.text-red {
  color: #8a1f1f;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  padding: 16px 20px;
  border-top: 1px solid #d7dbe0;
  background: #f4f5f7;
}
</style>
