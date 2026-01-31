import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../core/services';
import { AuthService } from '../../core/services';
import { Transaction, TransactionsPage, TransactionQuery, User } from '../../core/models';
import { Subject, takeUntil, finalize } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  
  transactions: Transaction[] = [];
  loading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  
  private destroy$ = new Subject<void>();

  constructor() {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(page: number = 1): void {
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    const query: TransactionQuery = {
      page: page,
      take: this.pageSize,
      order: 'DESC'
    };

    this.notificationService.getNotifications(query)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response: TransactionsPage) => {
          this.transactions = response.data;
          this.totalItems = response.meta.itemCount;
          this.totalPages = response.meta.pageCount;
          this.currentPage = response.meta.page;
        },
        error: (err) => {
          this.error = 'Failed to load notifications. Please try again.';
          console.error('Error loading notifications:', err);
        }
      });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.loadNotifications(page);
    }
  }

  refresh(): void {
    this.loadNotifications(this.currentPage);
  }

  isIncomingTransaction(transaction: Transaction): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return false;
    }
    
    // Check if the current user is the recipient
    return transaction.recipientBill.user?.uuid === currentUser.uuid;
  }

  formatAmount(amount: number, currency?: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  trackByTransactionId(index: number, transaction: Transaction): string {
    return transaction.uuid;
  }
}