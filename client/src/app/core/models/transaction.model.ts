import { EntityModel, Currency, User } from './user.model';

export interface NotificationBill extends EntityModel {
  accountBillNumber: string;
  amountMoney?: string;
  currency?: Currency;
  user?: User;
}

export interface NotificationTransaction extends EntityModel {
  amountMoney: number;
  transferTitle: string;
  authorizationKey: string;
  authorizationStatus: boolean;
  updatedAt: string;
  createdAt: string;
  recipientBill?: NotificationBill;
  senderBill?: NotificationBill;
}

export interface NotificationPageMeta {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
}

export interface NotificationsPage {
  data: NotificationTransaction[];
  meta: NotificationPageMeta;
}

// Transaction Feature Models

export enum TransactionType {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export interface Transaction extends EntityModel {
  id: number;
  amountMoney: number;
  transferTitle: string;
  authorizationKey?: string;
  authorizationStatus: boolean; // true = confirmed, false = pending
  senderBill: NotificationBill;
  recipientBill: NotificationBill;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionPageMeta {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface TransactionsPage {
  data: Transaction[];
  meta: TransactionPageMeta;
}


export interface NotificationQuery {
  page?: number;
  take?: number;
  order?: 'ASC' | 'DESC';
}

// Transfer Feature Models

export enum TransferLocale {
  DE = 'de',
  EN = 'en',
  PL = 'pl',
}

export interface CreateTransactionRequest {
  amountMoney: number;
  transferTitle: string;
  senderBill: string;
  recipientBill: string;
  locale: TransferLocale;
}

export interface CreateTransactionResponse {
  uuid: string;
}

export interface SearchBillResult {
  uuid: string;
  accountBillNumber: string;
  amountMoney?: string;
  currency: { uuid: string; name: string; currentExchangeRate: number };
  user?: { uuid: string; firstName: string; lastName: string };
}

export interface SearchBillsResponse {
  data: SearchBillResult[];
}