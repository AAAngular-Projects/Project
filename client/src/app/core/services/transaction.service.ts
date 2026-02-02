import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TransactionsPage, TransactionType, CreateTransactionRequest, CreateTransactionResponse, ConfirmTransactionRequest } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly http = inject(HttpClient);
  // TODO: Move to environment configuration
  private readonly API_URL = 'http://localhost:4000/bank';

  getTransactions(params: {
    page: number;
    take: number;
    order: 'ASC' | 'DESC';
    dateFrom?: string;
    dateTo?: string;
    type?: TransactionType;
  }): Observable<TransactionsPage> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('take', params.take)
      .set('order', params.order);

    if (params.dateFrom) httpParams = httpParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) httpParams = httpParams.set('dateTo', params.dateTo);
    if (params.type) httpParams = httpParams.set('type', params.type);

    return this.http.get<TransactionsPage>(`${this.API_URL}/Transactions`, { params: httpParams });
  }

  downloadConfirmation(uuid: string, locale: string = 'en'): Observable<Blob> {
    return this.http.get(`${this.API_URL}/Transactions/${uuid}/${locale}/confirmationFile`, { responseType: 'blob' });
  }

  createTransaction(request: CreateTransactionRequest): Observable<CreateTransactionResponse> {
    return this.http.post<CreateTransactionResponse>(`${this.API_URL}/Transactions/create`, request);
  }

  getAuthorizationKey(uuid: string): Observable<{ authorizationKey: string }> {
    return this.http.get<{ authorizationKey: string }>(`${this.API_URL}/Transactions/${uuid}/authorizationKey`);
  }

  confirmTransaction(authorizationKey: string): Observable<void> {
    const request: ConfirmTransactionRequest = { authorizationKey };
    return this.http.patch<void>(`${this.API_URL}/Transactions/confirm`, request);
  }
}
