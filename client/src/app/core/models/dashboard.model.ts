export interface AccountBalance {
  revenues: string;
  expenses: string;
  currencyName: string;
}

export interface AmountMoney {
  amountMoney: string;
  currencyName: string;
}

export interface Bill {
  id: string;
  accountBillNumber: string;
  amountMoney?: string;
  currency: {
    id: string;
    name: string;
    currentExchangeRate: number;
  };
}

export interface BillsResponse {
  data: Bill[];
  meta: {
    page: number;
    take: number;
    itemCount: number;
    pageCount: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
}

export interface BalanceHistoryItem {
  date: string;
  balance: number;
}

export interface Transaction {
  id: string;
  amountMoney: number;
  transferTitle: string;
  authorizationKey: string;
  authorizationStatus: boolean;
  createdDate: string;
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface TransactionsResponse {
  items: Transaction[];
  total: number;
}
