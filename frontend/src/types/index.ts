export interface User {
  id: number;
  email: string;
  full_name: string;
}

export interface LoginResponse {
  success: boolean;
  user_id: number | null;
  user_email: string | null;
  user_name: string | null;
  message: string;
}

export interface Contract {
  id: number;
  number: string;
  client_name: string;
  amount: number;
  signed_date: string;
  status: "active" | "closed" | "cancelled";
  created_at: string;
}

export interface Payment {
  id: number;
  contract_id: number;
  amount: number;
  paid_at: string;
  method: "bank" | "card" | "cash";
  comment?: string | null;
}

export interface DebtRow {
  contract_id: number;
  contract_number: string;
  client_name: string;
  contract_amount: number;
  paid_amount: number;
  debt: number;
}
