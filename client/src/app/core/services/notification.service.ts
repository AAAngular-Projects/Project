import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TransactionsPage, TransactionQuery } from '../models';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly apiUrl = 'http://localhost:4000/bank/Notifications';

  constructor(private http: HttpClient) {}

  /**
   * Get list of recent transactions (notification feed)
   * @param params Query parameters for pagination and ordering
   * @returns Observable of TransactionsPage
   */
  getNotifications(params: TransactionQuery = {}): Observable<TransactionsPage> {
    const queryParams = new URLSearchParams();
    
    if (params.page) {
      queryParams.set('page', params.page.toString());
    }
    
    if (params.take) {
      queryParams.set('take', params.take.toString());
    }
    
    if (params.order) {
      queryParams.set('order', params.order);
    }

    const url = queryParams.toString() 
      ? `${this.apiUrl}?${queryParams.toString()}`
      : this.apiUrl;

    return this.http.get<TransactionsPage>(url);
  }
}