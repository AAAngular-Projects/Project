import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, delay } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  Account, 
  AccountsResponse, 
  AccountTransaction, 
  AccountTransactionsResponse,
  AccountType 
} from '@core/models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {
  private readonly API_URL = environment.apiUrl;
  
  selectedAccountId = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  getAccounts(): Observable<AccountsResponse> {
    return this.http.get<any>(`${this.API_URL}/Bills`, {
      params: { page: '1', take: '50' }
    }).pipe(
      map(response => ({
        data: response.data.map((bill: any) => ({
          id: bill.uuid,
          accountNumber: bill.accountBillNumber,
          accountType: AccountType.CHECKING,
          balance: parseFloat(bill.amountMoney || '0'),
          currency: bill.currency.name,
          nickname: `${bill.currency.name} Account`,
          isActive: true,
          createdDate: bill.createdDate || new Date().toISOString()
        })),
        meta: {
          total: response.meta.itemCount,
          page: response.meta.page,
          pageSize: response.meta.take
        }
      })),
      catchError(error => {
        console.error('Error loading accounts:', error);
        return of({
          data: [],
          meta: { total: 0, page: 1, pageSize: 10 }
        });
      })
    );
  }

  /**
   * Get a specific account by ID
   */
  getAccountById(id: string): Observable<Account> {
    // TODO: Replace with actual API call
    // return this.http.get<Account>(`${this.API_URL}/accounts/${id}`);
    
    return this.getAccounts().pipe(
      map(response => {
        const account = response.data.find((acc: Account) => acc.id === id);
        if (!account) {
          throw new Error(`Account with id ${id} not found`);
        }
        return account;
      }),
      catchError(error => {
        console.error('Error fetching account:', error);
        throw error;
      })
    );
  }

  /**
   * Get transactions for a specific account with optional filtering
   */
  getTransactions(accountId: string): Observable<AccountTransactionsResponse> {
    return this.http.get<any>(`${this.API_URL}/Transactions/bill/${accountId}`, {
      params: { page: '1', take: '50' }
    }).pipe(
      map(response => ({
        data: response.data.map((txn: any) => ({
          id: txn.uuid,
          uuid: txn.uuid,
          amountMoney: txn.amountMoney,
          transferTitle: txn.transferTitle,
          authorizationStatus: txn.authorizationStatus,
          createdDate: txn.createdDate,
          updatedAt: txn.updatedAt,
          recipientBill: txn.recipientBill,
          senderBill: txn.senderBill
        })),
        meta: {
          total: response.meta.itemCount,
          page: response.meta.page,
          pageSize: response.meta.take
        }
      })),
      catchError(error => {
        console.error('Error loading transactions:', error);
        return of({
          data: [],
          meta: { total: 0, page: 1, pageSize: 10 }
        });
      })
    );
  }

  /**
   * Set the selected account ID
   */
  selectAccount(id: string): void {
    this.selectedAccountId.set(id);
  }

  /**
   * Clear the selected account
   */
  clearSelection(): void {
    this.selectedAccountId.set(null);
  }
}
