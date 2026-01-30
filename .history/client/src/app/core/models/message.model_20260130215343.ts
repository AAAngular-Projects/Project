import { EntityModel, User, PageMeta } from './user.model';

export interface Language extends EntityModel {
  name: string;
  code: string;
}

export interface MessageTemplate extends EntityModel {
  subject: string;
  content: string;
  actions?: string[];
  language: Language;
}

export interface MessageKey extends EntityModel {
  name: string;
}

export interface Message extends EntityModel {
  readed: boolean;
  createdAt: string;
  updatedAt?: string;
  sender: User;
  recipient: User;
  templates: MessageTemplate[];
  key: MessageKey;
}

export interface PageMeta {
  page: number;
  take: number;
  itemCount: number;
  pageCount: number;
}

export interface MessagesPage {
  data: Message[];
  meta: PageMeta;
}

export interface MessageQuery {
  page?: number;
  take?: number;
  order?: 'ASC' | 'DESC';
}

export interface ReadMessagePayload {
  uuid?: string;
}

export interface CreateMessageTemplatePayload {
  language: string;
  subject: string;
  content: string;
  actions?: string;
}

export interface CreateMessagePayload {
  sender: string;
  recipient: string;
  key: string;
  templates: CreateMessageTemplatePayload[];
}
