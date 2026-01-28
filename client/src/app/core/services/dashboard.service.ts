import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, startWith, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { 
  AccountBalance, 
  AmountMoney,
  Bill,
  BillsResponse,
  BalanceHistoryItem, 
  Transaction, 
  TransactionsResponse 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:4000/bank';


  accountBalance = signal<AccountBalance | null>(null);

  availableFunds = signal<AmountMoney | null>(null);

  bills = signal<BillsResponse | null>(null);

  balanceHistory = signal<BalanceHistoryItem[]>([]);

  recentTransactions = signal<TransactionsResponse>({ items: [], total: 0 });

  /**
   * Load all dashboard data
   */
  loadDashboardData(): void {
    this.loadAccountBalance();
    this.loadAvailableFunds();
    this.loadBills();
    this.loadBalanceHistory();
    this.loadRecentTransactions();
  }

  private loadAccountBalance(): void {
    this.http.get<AccountBalance>(`${this.API_URL}/Bills/accountBalance`)
      .pipe(
        catchError(err => {
          console.error('Error loading account balance:', err);
          return of(null);
        })
      )
      .subscribe(data => this.accountBalance.set(data));
  }

  private loadAvailableFunds(): void {
    this.http.get<AmountMoney>(`${this.API_URL}/Bills/amountMoney`)
      .pipe(
        catchError(err => {
          console.error('Error loading available funds:', err);
          return of(null);
        })
      )
      .subscribe(data => this.availableFunds.set(data));
  }

  private loadBills(): void {
    this.http.get<BillsResponse>(`${this.API_URL}/Bills`, {
      params: { page: '1', take: '10' }
    })
      .pipe(
        catchError(err => {
          console.error('Error loading bills:', err);
          return of(null);
        })
      )
      .subscribe(data => this.bills.set(data));
  }

  private loadBalanceHistory(): void {
    this.http.get<{ accountBalanceHistory: number[] }>(`${this.API_URL}/Bills/accountBalanceHistory`)
      .pipe(
        catchError(err => {
          console.error('Error loading balance history:', err);
          return of({ accountBalanceHistory: [] });
        })
      )
      .subscribe(response => {
        const history = (response?.accountBalanceHistory || []).map((balance, index) => ({
          date: new Date(Date.now() - (response.accountBalanceHistory.length - index - 1) * 24 * 60 * 60 * 1000).toISOString(),
          balance: Number(balance)
        }));
        this.balanceHistory.set(history);
      });
  }

  private loadRecentTransactions(): void {
    this.http.get<TransactionsResponse>(`${this.API_URL}/Transactions`, { 
      params: { page: '1', take: '5' } 
    })
      .pipe(
        catchError(err => {
          console.error('Error loading transactions:', err);
          return of({ items: [], total: 0 } as TransactionsResponse);
        })
      )
      .subscribe(data => this.recentTransactions.set(data));
  }

  /**
   * Refresh all dashboard data
   */
  refreshData(): void {
    this.loadDashboardData();
  }

  /**
   * Get account balance (for backward compatibility)
   */
  getAccountBalance() {
    return this.http.get<AccountBalance>(`${this.API_URL}/Bills/accountBalance`);
  }

  /**
   * Get balance history (for backward compatibility)
   */
  getBalanceHistory() {
    return this.http.get<BalanceHistoryItem[]>(`${this.API_URL}/Bills/accountBalanceHistory`);
  }

  /**
   * Get transactions (for backward compatibility)
   */
  getTransactions(limit: number = 10, offset: number = 0) {
    const params = {
      limit: limit.toString(),
      offset: offset.toString()
    };
    return this.http.get<TransactionsResponse>(`${this.API_URL}/Transactions`, { params });
  }
}
