import axios, { AxiosError } from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 10_000,
  headers: {
    "Content-Type": "application/json",
    // PostgREST требует Prefer для возврата созданной записи
    Prefer: "return=representation",
  },
});

// Логируем ошибки на фронте и пытаемся записать в error_log
api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const payload = {
      source: "frontend",
      message: error.message,
      details: {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
      },
    };
    // best-effort, не валим UI
    try {
      await axios.post("/api/error_log", payload, {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      /* ignore */
    }
    return Promise.reject(error);
  },
);

export default api;
