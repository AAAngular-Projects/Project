import { EntityModel, Currency, User } from './user.model';

export interface Bill extends EntityModel {
  accountBillNumber: string;
  amountMoney?: string;
  currency: Currency;
  user?: User;
}

export interface Transaction extends EntityModel {
  amountMoney: number;
  transferTitle: string;
  authorizationKey: string;
  authorizationStatus: boolean;
  updatedAt: string;
  recipientBill: Bill;
  senderBill: Bill;
}

export interface TransactionPageMeta {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
}

export interface TransactionsPage {
  data: Transaction[];
  meta: TransactionPageMeta;
}

export interface TransactionQuery {
  page?: number;
  take?: number;
  order?: 'ASC' | 'DESC';
}