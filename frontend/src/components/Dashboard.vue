<script setup lang="ts">
import { computed } from "vue";
import { usePaymentsStore } from "../stores/payments";

const store = usePaymentsStore();

const totalContract = computed(() =>
  store.contracts.reduce((s, c) => s + Number(c.amount), 0),
);
const totalPaid = computed(() =>
  store.payments.reduce((s, p) => s + Number(p.amount), 0),
);
const totalDebt = computed(() => totalContract.value - totalPaid.value);
const activeCount = computed(
  () => store.contracts.filter((c) => c.status === "active").length,
);

const fmt = (n: number) =>
  n.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ₽";
</script>

<template>
  <section class="section-head">
    <h2 class="section-title">Обзор</h2>
    <span class="section-meta">Сводные показатели по активным договорам</span>
  </section>

  <div class="metrics">
    <div class="metric">
      <div class="metric-label">Активных договоров</div>
      <div class="metric-value">{{ activeCount }}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Сумма по договорам</div>
      <div class="metric-value">{{ fmt(totalContract) }}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Поступило платежей</div>
      <div class="metric-value">{{ fmt(totalPaid) }}</div>
    </div>
    <div class="metric">
      <div class="metric-label">Задолженность</div>
      <div class="metric-value metric-value-negative">{{ fmt(totalDebt) }}</div>
    </div>
  </div>

  <section class="section-head section-head-sub">
    <h3 class="section-title-sm">Последние операции</h3>
    <span class="section-meta">Не более 10 записей</span>
  </section>

  <table>
    <thead>
      <tr>
        <th style="width: 160px">Дата</th>
        <th style="width: 140px">Договор</th>
        <th style="width: 120px">Способ</th>
        <th class="num" style="width: 140px">Сумма</th>
        <th>Комментарий</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="p in store.payments.slice(0, 10)" :key="p.id">
        <td>{{ new Date(p.paid_at).toLocaleString("ru-RU") }}</td>
        <td>
          {{
            store.contracts.find((c) => c.id === p.contract_id)?.number ??
            p.contract_id
          }}
        </td>
        <td>{{ p.method }}</td>
        <td class="num">{{ fmt(Number(p.amount)) }}</td>
        <td>{{ p.comment || "—" }}</td>
      </tr>
      <tr v-if="!store.payments.length">
        <td colspan="5" class="empty">Записи отсутствуют</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e3e6ea;
  margin-bottom: 20px;
}
.section-head-sub {
  margin-top: 32px;
}
.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #1c1f23;
  text-transform: uppercase;
}
.section-title-sm {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #4a5058;
  text-transform: uppercase;
}
.section-meta {
  font-size: 12px;
  color: #6a7079;
  letter-spacing: 0.01em;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0;
  border: 1px solid #d7dbe0;
  background: #f7f8fa;
}
.metric {
  padding: 18px 20px;
  border-right: 1px solid #d7dbe0;
}
.metric:last-child {
  border-right: none;
}
.metric-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6a7079;
  margin-bottom: 8px;
}
.metric-value {
  font-size: 20px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #1c1f23;
}
.metric-value-negative {
  color: #8a1f1f;
}

.empty {
  text-align: center;
  color: #6a7079;
  padding: 24px 0;
  font-size: 12px;
  letter-spacing: 0.02em;
}
</style>
