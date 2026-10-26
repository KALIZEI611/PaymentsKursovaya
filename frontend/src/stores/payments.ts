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
        this.contracts = [...c.data];
        this.payments = [...p.data];
        this.debt = [...d.data];
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
      if (!payload.contract_id) throw new Error("Выберите договор");
      if (!Number.isFinite(payload.amount) || payload.amount <= 0)
        throw new Error("Сумма должна быть положительным числом");

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

      const created = res.data[0];
      if (created) {
        this.payments = [created, ...this.payments];
      }

      this.loadAll().catch(() => {});
      return created;
    },

    async addContract(payload: {
      client_name: string;
      amount: number;
      signed_date: string;
    }) {
      if (!payload.client_name.trim()) throw new Error("Клиент обязателен");
      if (!Number.isFinite(payload.amount) || payload.amount <= 0)
        throw new Error("Сумма договора должна быть положительной");

      try {
        // ОТПРАВЛЯЕМ СТРОГО ТОЛЬКО ЭТИ ПОЛЯ
        const res = await api.post<Contract[]>("/contracts", {
          client_name: payload.client_name,
          amount: payload.amount,
          signed_date: payload.signed_date,
          status: "active",
        });

        const created = res.data[0];
        if (created) {
          this.contracts = [...this.contracts, created];
        }
        this.loadAll().catch(() => {});
      } catch (e: any) {
        const status = e?.response?.status;
        const details = e?.response?.data?.details ?? "";
        const message = e?.response?.data?.message ?? "";

        if (status === 409 || message.includes("duplicate key")) {
          throw new Error(`Ошибка: договор с таким номером уже существует.`);
        }
        if (status === 400) {
          if (details.includes("amount")) {
            throw new Error("Сумма договора должна быть положительной");
          }
          throw new Error(details || message || "Некорректные данные договора");
        }
        throw new Error(
          message || details || e?.message || "Ошибка сохранения",
        );
      }
    },

    async closeContract(id: number) {
      try {
        const res = await api.patch<Contract[]>(`/contracts?id=eq.${id}`, {
          status: "closed",
        });
        const updated = res.data[0];
        if (updated) {
          this.contracts = this.contracts.map((c) =>
            c.id === id ? updated : c,
          );
        }
        this.loadAll().catch(() => {});
      } catch (e: any) {
        throw new Error("Не удалось закрыть договор");
      }
    },
  },
});
