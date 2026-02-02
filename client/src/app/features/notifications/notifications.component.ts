import { Component, OnInit, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services';
import { AuthService } from '../../core/services';
import { NotificationTransaction, NotificationsPage, NotificationQuery, User } from '../../core/models';
import { Subject, takeUntil, finalize, catchError, of } from 'rxjs';

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
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  
  transactions: NotificationTransaction[] = [];
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
    if (this.loading) {
      return; // Prevent multiple simultaneous requests
    }
    
    // Check if user is authenticated
    if (!this.authService.currentUser()) {
      this.error = 'You need to be logged in to view notifications.';
      return;
    }
    
    console.log('Starting to load notifications for page:', page);
    this.loading = true;
    this.error = null;
    this.currentPage = page;

    const query: NotificationQuery = {
      page: page,
      take: this.pageSize,
      order: 'DESC'
    };

    console.log('Making API call with query:', query);

    this.notificationService.getNotifications(query)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error loading notifications:', error);
          
          if (error.status === 401) {
            this.error = 'Session expired. Please log in again.';
            // Redirect to login after a short delay
            setTimeout(() => {
              this.router.navigate(['/auth/login']);
            }, 2000);
          } else {
            this.error = 'Failed to load notifications. Please try again.';
          }
          
          return of(null); // Return empty observable to complete the stream
        }),
        finalize(() => {
          console.log('HTTP request completed, setting loading to false');
          this.loading = false;
          this.cdr.detectChanges(); // Ensure UI updates
        })
      )
      .subscribe({
        next: (response: NotificationsPage | null) => {
          console.log('Received response:', response);
          if (response) {
            this.transactions = response.data;
            this.totalItems = response.meta.itemCount;
            this.totalPages = response.meta.pageCount;
            this.currentPage = response.meta.page;
            console.log('Updated transactions:', this.transactions.length);
          }
          this.cdr.detectChanges(); // Ensure UI updates
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

  clearError(): void {
    this.error = null;
  }

  retry(): void {
    this.clearError();
    this.loadNotifications(this.currentPage);
  }

  isIncomingTransaction(transaction: NotificationTransaction): boolean {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return false;
    }
    
    // Check if the current user is the recipient
    return transaction.recipientBill?.user?.uuid === currentUser.uuid;
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

  trackByTransactionId(index: number, transaction: NotificationTransaction): string {
    return transaction.uuid;
  }
}