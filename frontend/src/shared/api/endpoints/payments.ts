import { apiClient } from "../client";

export interface Balance {
  available: number;
  pending: number;
  total_earned: number;
  total_spent: number;
}

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

export interface EscrowStatus {
  id?: string;
  order_id: string;
  client_id?: string;
  freelancer_id?: string;
  amount: number;
  status: string;
  created_at?: string;
  released_at?: string;
}

export interface WithdrawInput {
  amount: number;
  method?: string;
  card_last4?: string;
  bank_name?: string;
}

export interface DepositInput {
  amount: number;
  method?: string;
}

type BackendBalance = {
  available?: number;
  frozen?: number;
  pending?: number;
  total_earned?: number;
  total_spent?: number;
};

type BackendTransaction = {
  id: string;
  type: string;
  amount: number;
  description?: string | null;
  status: string;
  created_at: string;
};

const mapBalance = (raw: BackendBalance): Balance => ({
  available: typeof raw.available === "number" ? raw.available : 0,
  pending:
    typeof raw.pending === "number"
      ? raw.pending
      : typeof raw.frozen === "number"
        ? raw.frozen
        : 0,
  total_earned: typeof raw.total_earned === "number" ? raw.total_earned : 0,
  total_spent: typeof raw.total_spent === "number" ? raw.total_spent : 0,
});

export const paymentsApi = {
  async getBalance(): Promise<Balance> {
    const raw = await apiClient.request<BackendBalance>("/payments/balance");
    return mapBalance(raw);
  },

  async getTransactions(): Promise<Transaction[]> {
    const response = await apiClient.requestPaginated<BackendTransaction>("/payments/transactions");
    return response.data.map((item) => ({
      id: item.id,
      type: item.type,
      amount: item.amount,
      description: item.description ?? "",
      status: item.status,
      created_at: item.created_at,
    }));
  },

  async deposit(input: DepositInput): Promise<Balance> {
    const raw = await apiClient.request<BackendBalance>("/payments/deposit", {
      method: "POST",
      body: JSON.stringify({ amount: input.amount }),
    });
    return mapBalance(raw);
  },

  async getEscrow(orderId: string): Promise<EscrowStatus> {
    return apiClient.request<EscrowStatus>(`/payments/escrow/${orderId}`);
  },

  async releaseEscrow(orderId: string): Promise<EscrowStatus> {
    return apiClient.request<EscrowStatus>(`/payments/escrow/${orderId}/release`, {
      method: "POST",
    });
  },

  async withdraw(input: WithdrawInput): Promise<void> {
    const cardLast4 = input.card_last4 ?? "0000";
    const bankName = input.bank_name ?? input.method ?? "manual";
    return apiClient.request<void>("/withdrawals", {
      method: "POST",
      body: JSON.stringify({
        amount: input.amount,
        card_last4: cardLast4,
        bank_name: bankName,
      }),
    });
  },
};
