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

      try {
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
      } catch (e: any) {
        const dbMessage = e?.response?.data?.message ?? "";

        if (dbMessage.includes("Переплата!")) {
          this.loadAll().catch(() => {});
          throw new Error(dbMessage);
        }

        if (e?.response?.status === 400) {
          throw new Error("Некорректная сумма платежа");
        }

        throw new Error("Не удалось сохранить платёж");
      }
    },

    async addContract(payload: {
      client_name: string;
      amount: number;
      signed_date: string;
    }) {
      const name = payload.client_name.trim();
      if (!name) throw new Error("Клиент обязателен");

      const orgRegex = /^(ООО|ИП|АО|ПАО|ЗАО|ОАО|ФГУП|ГУП|МУП|НКО|АНО|ТСЖ)\s+/i;
      if (!orgRegex.test(name)) {
        throw new Error(
          'Название должно начинаться с организационной формы (ООО, ИП, АО и т.д.) и пробела. Например: ООО "Ромашка"',
        );
      }

      const exists = this.contracts.some(
        (c) => c.client_name.toLowerCase() === name.toLowerCase(),
      );
      if (exists) {
        throw new Error(
          "Клиент с таким названием уже существует. Укажите уникальное название (например, добавьте № филиала).",
        );
      }

      if (!Number.isFinite(payload.amount) || payload.amount <= 0)
        throw new Error("Сумма договора должна быть положительной");

      try {
        const res = await api.post<Contract[]>("/contracts", {
          client_name: name,
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
          if (details.includes("client_name")) {
            throw new Error(
              "Некорректное название клиента. Оно должно начинаться с ООО, ИП, АО и т.д.",
            );
          }
          throw new Error(details || message || "Некорректные данные договора");
        }
        throw new Error(
          message || details || e?.message || "Ошибка сохранения",
        );
      }
    },

    async closeContract(id: number) {
      const contract = this.contracts.find((c) => c.id === id);
      if (contract) {
        const paid = this.payments
          .filter((p) => p.contract_id === id)
          .reduce((s, p) => s + Number(p.amount), 0);

        const debt = Number(contract.amount) - paid;
        if (debt > 0) {
          throw new Error(
            `Невозможно закрыть договор. Остаток к оплате: ${debt.toLocaleString(
              "ru-RU",
            )} ₽. Сначала погасите задолженность.`,
          );
        }
      }

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
