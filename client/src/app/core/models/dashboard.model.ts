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
  uuid: string;
  accountBillNumber: string;
  amountMoney?: string;
  currency: {
    uuid: string;
    name: string;
    currentExchangeRate: number;
  };
  user?: {
    uuid: string;
    firstName: string;
    lastName: string;
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
  uuid: string;
  amountMoney: string;
  transferTitle: string;
  authorizationKey: string;
  authorizationStatus: boolean;
  createdDate: string;
  recipient?: {
    uuid: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  sender?: {
    uuid: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  senderBill?: {
    uuid: string;
    accountBillNumber: string;
    user?: {
      uuid: string;
      firstName: string;
      lastName: string;
    };
  };
  recipientBill?: {
    uuid: string;
    accountBillNumber: string;
    user?: {
      uuid: string;
      firstName: string;
      lastName: string;
    };
  };
}

export interface TransactionsResponse {
  data: Transaction[];
  meta: {
    page: number;
    take: number;
    itemCount: number;
    pageCount: number;
  };
}
