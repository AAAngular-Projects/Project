import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NotificationsPage, NotificationQuery } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/Notifications`;

  /**
   * Get list of recent transactions (notification feed)
   * @param params Query parameters for pagination and ordering
   * @returns Observable of NotificationsPage
   */
  getNotifications(params: NotificationQuery = {}): Observable<NotificationsPage> {
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

    return this.http.get<NotificationsPage>(url);
  }
}