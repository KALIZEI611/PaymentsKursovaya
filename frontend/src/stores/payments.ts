import { defineStore } from "pinia";
import api from "../api/client";
import type { Contract, Payment, DebtRow } from "../types";

interface State {
  contracts: Contract[];
  payments: Payment[];
  debt: DebtRow[];
  loading: boolean;
  error: string | null;
}

export const usePaymentsStore = defineStore("payments", {
  state: (): State => ({
    contracts: [],
    payments: [],
    debt: [],
    loading: false,
    error: null,
  }),

  actions: {
    async loadAll() {
      this.loading = true;
      this.error = null;
      try {
        const [c, p, d] = await Promise.all([
          api.get<Contract[]>("/contracts?order=id.asc"),
          api.get<Payment[]>("/payments?order=paid_at.desc&limit=50"),
          api.get<DebtRow[]>("/v_debt_report"),
        ]);
        this.contracts = c.data;
        this.payments = p.data;
        this.debt = d.data;
      } catch (e: any) {
        this.error = e?.message ?? "Ошибка загрузки";
      } finally {
        this.loading = false;
      }
    },

    async addPayment(payload: {
      contract_id: number;
      amount: number;
      method: "bank" | "card" | "cash";
      comment?: string;
    }) {
      // Валидация на фронте
      if (!payload.contract_id) throw new Error("Выберите договор");
      if (!Number.isFinite(payload.amount) || payload.amount <= 0)
        throw new Error("Сумма должна быть положительным числом");

      // Дополнительная проверка: переплата
      const contract = this.contracts.find((c) => c.id === payload.contract_id);
      if (!contract) throw new Error("Договор не найден");

      const already = this.payments
        .filter((p) => p.contract_id === payload.contract_id)
        .reduce((s, p) => s + Number(p.amount), 0);

      if (already + payload.amount > Number(contract.amount)) {
        throw new Error(
          `Переплата! Остаток по договору: ${
            Number(contract.amount) - already
          } ₽`,
        );
      }

      const res = await api.post<Payment[]>("/payments", {
        contract_id: payload.contract_id,
        amount: payload.amount,
        method: payload.method,
        comment: payload.comment ?? null,
      });

      await this.loadAll();
      return res.data[0];
    },

    async addContract(payload: {
      number: string;
      client_name: string;
      amount: number;
      signed_date: string;
    }) {
      if (!payload.number.trim()) throw new Error("Номер договора обязателен");
      if (!payload.client_name.trim()) throw new Error("Клиент обязателен");
      if (!Number.isFinite(payload.amount) || payload.amount <= 0)
        throw new Error("Сумма договора должна быть положительной");

      await api.post("/contracts", { ...payload, status: "active" });
      await this.loadAll();
    },
  },
});
