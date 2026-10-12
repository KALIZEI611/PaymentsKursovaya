<script setup lang="ts">
import { usePaymentsStore } from "../stores/payments";

const store = usePaymentsStore();
const fmt = (n: number) =>
  n.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " ₽";
</script>

<template>
  <section class="head">
    <div>
      <h2 class="title">Отчёт по задолженности</h2>
      <div class="subtitle">
        Активные договоры с незакрытыми обязательствами
      </div>
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th style="width: 140px">№ договора</th>
        <th>Клиент</th>
        <th class="num" style="width: 170px">Сумма договора</th>
        <th class="num" style="width: 170px">Оплачено</th>
        <th class="num" style="width: 170px">Задолженность</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="r in store.debt" :key="r.contract_id">
        <td class="mono">{{ r.contract_number }}</td>
        <td>{{ r.client_name }}</td>
        <td class="num">{{ fmt(Number(r.contract_amount)) }}</td>
        <td class="num">{{ fmt(Number(r.paid_amount)) }}</td>
        <td class="num" :class="{ neg: Number(r.debt) > 0 }">
          {{ fmt(Number(r.debt)) }}
        </td>
      </tr>
      <tr v-if="!store.debt.length">
        <td colspan="5" class="empty">Задолженность отсутствует</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.head {
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
}

.mono {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
.neg {
  color: #8a1f1f;
  font-weight: 600;
}
.empty {
  text-align: center;
  color: #6a7079;
  padding: 24px 0;
  font-size: 12px;
}
</style>
