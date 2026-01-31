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

export interface NotificationQuery {
  page?: number;
  take?: number;
  order?: 'ASC' | 'DESC';
}