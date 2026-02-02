import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Budget,
  CreateBudget,
  UpdateBudget,
  SpendingAnalytics,
} from '../models/budget.model';

@Injectable({
  providedIn: 'root'
})
export class BudgetService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  getBudgets(month?: number, year?: number): Observable<Budget[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    if (year) params = params.set('year', year);
    
    return this.http.get<Budget[]>(`${this.API_URL}/Budgets`, { params });
  }

  getBudgetById(id: number): Observable<Budget> {
    return this.http.get<Budget>(`${this.API_URL}/Budgets/${id}`);
  }

  createBudget(data: CreateBudget): Observable<Budget> {
    return this.http.post<Budget>(`${this.API_URL}/Budgets/create`, data);
  }

  updateBudget(id: number, data: UpdateBudget): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/Budgets/${id}`, data);
  }

  deleteBudget(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/Budgets/${id}`);
  }

  getSpendingAnalytics(month?: number, year?: number): Observable<SpendingAnalytics[]> {
    let params = new HttpParams();
    if (month) params = params.set('month', month);
    if (year) params = params.set('year', year);
    
    return this.http.get<SpendingAnalytics[]>(`${this.API_URL}/Budgets/analytics`, { params });
  }
}
