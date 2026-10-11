// Data exchanged with the backend API (backend/app/schemas.py and main.py)

export interface Snapshot {
  id: number;
  date: string;
  amount: number;
}

export interface AssetDetails {
  value?: number | null;
  [key: string]: unknown;
}

export interface Bank {
  id: number;
  name: string;
  balance: number;
}

export interface Asset {
  id: number;
  name: string;
  type: string;
  location?: string | null;
  bank_id?: number | null;
  details?: AssetDetails | null;
  snapshots: Snapshot[];
}

export interface Credit {
  id: number;
  name: string;
  type: string;
  limit?: number | null;
  interest_rate?: number | null;
  liability_id?: number | null;
}

export interface Liability {
  id: number;
  name: string;
  type: string;
  snapshots: Snapshot[];
}

export interface Expense {
  id: number;
  date: string;
  description: string;
  amount: number;
  bank_id: number | null;
  asset_id: number | null;
  credit_id: number | null;
  liability_id: number | null;
}

export interface Payment extends Expense {
  interest: number;
}

// Payloads sent to the API
export type LiabilityInput = { name: string; type: string };
export type AssetInput = Partial<Omit<Asset, "id" | "snapshots">>;
export type SnapshotInput = { date: string; amount: number; asset_id?: number; liability_id?: number };
export type BankInput = Partial<Omit<Bank, "id">>;
export type CreditInput = Partial<Omit<Credit, "id">>;
export type ContributionInput = { year?: number; type?: string; amount?: number; institution?: string | null };
export type InvestmentInput = {
  symbol?: string;
  quantity?: number;
  average_cost?: number;
  current_price?: number | null;
  asset_id?: number;
};
export type ExpenseInput = Omit<Expense, "id">;
export type PaymentInput = Omit<Payment, "id">;
