import { Component, inject, signal, computed, ViewChild, ElementRef, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { rxResource } from '@angular/core/rxjs-interop';
import { TransactionService } from '@core/services/transaction.service';
import { AuthService } from '@core/services/auth.service';
import { Transaction, TransactionType } from '@core/models/transaction.model';
import { MaskAccountNumberPipe } from '@shared/pipes/mask-account-number.pipe';
import { TransactionConfirmationComponent, TransactionSummary } from '@shared/components/transaction-confirmation/transaction-confirmation.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-transactions',
  imports: [CommonModule, ReactiveFormsModule, MaskAccountNumberPipe, TransactionConfirmationComponent],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscapeKey()'
  }
})
export class TransactionsComponent {
  private readonly transactionService = inject(TransactionService);
  private readonly authService = inject(AuthService);

  readonly TransactionType = TransactionType;
  readonly Math = Math;

  @ViewChild('tableContainer') tableContainer?: ElementRef<HTMLDivElement>;
  private previousPage = signal(1);

  // Filter signals
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly order = signal<'ASC' | 'DESC'>('DESC');
  readonly dateFrom = signal<string | undefined>(undefined);
  readonly dateTo = signal<string | undefined>(undefined);
  readonly type = signal<TransactionType | undefined>(undefined);

  // Form controls for UI binding
  readonly dateFromControl = new FormControl<string | null>(null);
  readonly dateToControl = new FormControl<string | null>(null);
  readonly typeControl = new FormControl<TransactionType | null>(null);

  readonly pageSizes = [10, 25, 50] as const;

  // Confirm modal signals
  readonly showConfirmModal = signal(false);
  readonly pendingTransaction = signal<TransactionSummary | null>(null);

  // Current user accessor
  readonly currentUser = this.authService.currentUser;

  constructor() {
    // Debounced date filters (300ms delay)
    this.dateFromControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(val => {
      this.dateFrom.set(val || undefined);
      this.page.set(1);
    });

    this.dateToControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(val => {
      this.dateTo.set(val || undefined);
      this.page.set(1);
    });

    // Immediate type filter (no debounce needed for dropdown)
    this.typeControl.valueChanges.subscribe(val => {
      this.type.set(val || undefined);
      this.page.set(1);
    });

    // Scroll to table top when page changes (for pagination)
    effect(() => {
      const currentPage = this.page();
      const prevPage = this.previousPage();
      
      if (currentPage !== prevPage && this.tableContainer) {
        // Only scroll if page actually changed (pagination click)
        setTimeout(() => {
          this.tableContainer?.nativeElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }, 50);
      }
      
      this.previousPage.set(currentPage);
    });
  }

  // Angular 21 rxResource: Reactive data fetching with automatic cancellation
  // Automatically refetches when any signal in the params function changes
  readonly transactionsResource = rxResource({
    params: () => ({
      page: this.page(),
      take: this.pageSize(),
      order: this.order(),
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
      type: this.type(),
    }),
    stream: ({ params }) => this.transactionService.getTransactions(params),
  });

  // Convenience accessors
  readonly transactions = computed(() => this.transactionsResource.value());
  readonly isLoading = computed(() => this.transactionsResource.isLoading());
  readonly error = computed(() => this.transactionsResource.error());

  onDownload(uuid: string) {
    this.transactionService.downloadConfirmation(uuid).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `confirmation-${uuid}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => console.error('Download failed', err)
    });
  }

  setPage(p: number) {
    const meta = this.transactions()?.meta;
    if (p >= 1 && (!meta || p <= meta.pageCount)) {
      this.page.set(p);
    }
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.page.set(1);
  }

  toggleSort() {
    this.order.set(this.order() === 'ASC' ? 'DESC' : 'ASC');
  }

  resetFilters() {
    this.dateFromControl.setValue(null, { emitEvent: false });
    this.dateToControl.setValue(null, { emitEvent: false });
    this.typeControl.setValue(null, { emitEvent: false });
    this.dateFrom.set(undefined);
    this.dateTo.set(undefined);
    this.type.set(undefined);
    this.page.set(1);
  }

  readonly hasActiveFilters = computed(() => {
    return !!(this.dateFrom() || this.dateTo() || this.type());
  });

  canConfirmTransaction(t: Transaction): boolean {
    const user = this.currentUser();
    return !t.authorizationStatus && t.senderBill?.user?.uuid === user?.uuid;
  }

  openConfirmModal(t: Transaction): void {
    this.pendingTransaction.set({
      uuid: t.uuid,
      amountMoney: t.amountMoney,
      currencyName: t.senderBill?.currency?.name || 'USD',
      recipientName: t.recipientBill?.user
        ? `${t.recipientBill.user.firstName} ${t.recipientBill.user.lastName}`
        : 'Unknown',
      transferTitle: t.transferTitle
    });
    this.showConfirmModal.set(true);
  }

  closeConfirmModal(): void {
    this.showConfirmModal.set(false);
    this.pendingTransaction.set(null);
  }

  onEscapeKey(): void {
    if (this.showConfirmModal()) {
      this.closeConfirmModal();
    }
  }

  onTransactionConfirmed(): void {
    this.transactionsResource.reload();
    this.closeConfirmModal();
  }

  onConfirmationCancelled(): void {
    this.closeConfirmModal();
  }
}
