import { EntityModel, Currency, User } from './user.model';

export enum TransactionCategory {
  FOOD = 'FOOD',
  RENT = 'RENT',
  SHOPPING = 'SHOPPING',
  UTILITIES = 'UTILITIES',
  ENTERTAINMENT = 'ENTERTAINMENT',
  TRANSPORTATION = 'TRANSPORTATION',
  HEALTHCARE = 'HEALTHCARE',
  EDUCATION = 'EDUCATION',
  SALARY = 'SALARY',
  OTHER = 'OTHER',
}

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
  category?: TransactionCategory;
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
  category?: TransactionCategory;
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