import { Component, inject, signal, computed } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TransactionService } from '@core/services/transaction.service';
import { TransactionType } from '@core/models/transaction.model';
import { MaskAccountNumberPipe } from '@shared/pipes/mask-account-number.pipe';
import { of, concat } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaskAccountNumberPipe],
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent {
  private readonly transactionService = inject(TransactionService);

  readonly TransactionType = TransactionType;

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

  constructor() {
    this.dateFromControl.valueChanges.subscribe(val => {
      this.dateFrom.set(val || undefined);
      this.page.set(1);
    });
    this.dateToControl.valueChanges.subscribe(val => {
        this.dateTo.set(val || undefined);
        this.page.set(1);
    });
    this.typeControl.valueChanges.subscribe(val => {
        this.type.set(val || undefined);
        this.page.set(1);
    });
  }

  // Reactive state derivation using declarative pattern
  private readonly requestParams = computed(() => ({
    page: this.page(),
    take: this.pageSize(),
    order: this.order(),
    dateFrom: this.dateFrom(),
    dateTo: this.dateTo(),
    type: this.type(),
  }));

  private readonly transactionsState = toSignal(
    toObservable(this.requestParams).pipe(
      switchMap(params => 
        concat(
          of({ status: 'loading' as const, data: undefined, error: undefined }),
          this.transactionService.getTransactions(params).pipe(
            map(data => ({ status: 'success' as const, data, error: undefined })),
            catchError(error => of({ status: 'error' as const, data: undefined, error }))
          )
        )
      )
    ),
    { initialValue: { status: 'loading' as const, data: undefined, error: undefined } }
  );

  readonly transactions = {
    value: computed(() => this.transactionsState().data),
    isLoading: computed(() => this.transactionsState().status === 'loading'),
    error: computed(() => this.transactionsState().status === 'error' ? this.transactionsState().error : null),
  };

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
      if (p >= 1) this.page.set(p);
  }
}
