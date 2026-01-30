import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import {
  CreateMessagePayload,
  Message,
  MessageQuery,
  MessagesPage,
  ReadMessagePayload,
} from '../models';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:4000/bank/Messages';

  private readonly messagesSignal = signal<Message[]>([]);
  private readonly metaSignal = signal<MessagesPage['meta'] | null>(null);
  private readonly isLoadingSignal = signal<boolean>(false);

  readonly messages: Signal<Message[]> = this.messagesSignal.asReadonly();
  readonly meta = this.metaSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();
  readonly unreadCount = computed(
    () => this.messagesSignal().filter((message) => !message.readed).length,
  );

  // Observable versions for use with resource()
  loadMessagesObservable(query: MessageQuery = {}): Observable<MessagesPage> {
    const { page = 1, take = 10, order = 'DESC' } = query;

    const params = new HttpParams()
      .set('page', page.toString())
      .set('take', take.toString())
      .set('order', order);

    return this.http.get<MessagesPage>(this.API_URL, { params });
  }

  createMessageObservable(payload: CreateMessagePayload): Observable<Message> {
    return this.http.post<Message>(this.API_URL, payload);
  }

  markAsReadObservable(payload: ReadMessagePayload = {}): Observable<void> {
    return this.http.patch<void>(this.API_URL, payload);
  }

  // Legacy signal-based methods (kept for backward compatibility)
  loadMessages(query: MessageQuery = {}): void {
    this.isLoadingSignal.set(true);

    const { page = 1, take = 10, order = 'DESC' } = query;

    const params = new HttpParams()
      .set('page', page.toString())
      .set('take', take.toString())
      .set('order', order);

    this.http
      .get<MessagesPage>(this.API_URL, { params })
      .pipe(
        tap({
          next: ({ data, meta }) => {
            this.messagesSignal.set(data);
            this.metaSignal.set(meta);
            this.isLoadingSignal.set(false);
          },
          error: () => {
            this.isLoadingSignal.set(false);
          },
        }),
      )
      .subscribe();
  }

  markAsRead(payload: ReadMessagePayload = {}): void {
    this.http
      .patch<void>(this.API_URL, payload)
      .pipe(
        tap({
          next: () => {
            if (!payload.uuid) {
              this.messagesSignal.update((messages) =>
                messages.map((message) => ({ ...message, readed: true })),
              );
              return;
            }

            this.messagesSignal.update((messages) =>
              messages.map((message) =>
                message.uuid === payload.uuid
                  ? { ...message, readed: true }
                  : message,
              ),
            );
          },
        }),
      )
      .subscribe();
  }

  createMessage(payload: CreateMessagePayload): void {
    this.http
      .post<Message>(this.API_URL, payload)
      .pipe(
        tap({
          next: (message) => {
            this.messagesSignal.update((messages) => [
              { ...message, readed: Boolean(message.readed) },
              ...messages,
            ]);
          },
        }),
      )
      .subscribe();
  }
}
