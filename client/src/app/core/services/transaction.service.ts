import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TransactionsPage, TransactionType } from '../models/transaction.model';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

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
}
