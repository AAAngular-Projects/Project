export enum AccountType {
  CHECKING = 'Checking',
  SAVINGS = 'Savings',
  CREDIT = 'Credit'
}

export interface Account {
  id: string;
  accountNumber: string;
  accountType: AccountType;
  balance: number;
  currency: string;
  nickname?: string;
  isActive: boolean;
  createdDate: string;
}

export interface AccountTransaction {
  id: string;
  uuid: string;
  amountMoney: string;
  transferTitle: string;
  authorizationStatus: boolean;
  createdDate: string;
  updatedAt: string;
  recipientBill?: any;
  senderBill?: any;
}

export interface AccountsResponse {
  data: Account[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface AccountTransactionsResponse {
  data: AccountTransaction[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
  };
}
