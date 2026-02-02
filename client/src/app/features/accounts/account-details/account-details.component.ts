import { 
  Component, 
  Input, 
  OnInit, 
  OnDestroy, 
  signal, 
  computed,
  effect, 
  AfterViewInit, 
  ViewChild, 
  ElementRef, 
  inject, 
  DestroyRef,
  ChangeDetectionStrategy 
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AccountsService } from '@core/services/accounts.service';
import { TransactionService } from '@core/services/transaction.service';
import { Account, AccountTransaction, TransactionType } from '@core/models';
import { MaskAccountNumberPipe } from '@shared/pipes/mask-account-number.pipe';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-account-details',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaskAccountNumberPipe],
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly accountsService = inject(AccountsService);
  private readonly transactionService = inject(TransactionService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  
  @Input() id?: string;
  @ViewChild('balanceChart') balanceChartCanvas!: ElementRef<HTMLCanvasElement>;

  readonly TransactionType = TransactionType;
  readonly Math = Math;

  account = signal<Account | null>(null);
  transactions = signal<AccountTransaction[]>([]);
  filteredTransactions = signal<AccountTransaction[]>([]);
  transactionsMeta = signal<{ total: number; page: number; pageSize: number; pageCount?: number } | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  showFullAccountNumber = signal<boolean>(false);
  copySuccess = signal<boolean>(false);
  downloadingPdf = signal<string | null>(null);

  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly dateFrom = signal<string | undefined>(undefined);
  readonly dateTo = signal<string | undefined>(undefined);
  readonly transactionType = signal<TransactionType | undefined>(undefined);

  readonly dateFromControl = new FormControl<string | null>(null);
  readonly dateToControl = new FormControl<string | null>(null);
  readonly typeControl = new FormControl<TransactionType | null>(null);
  readonly pageSizes = [10, 25, 50] as const;

  private balanceChart?: Chart;

  readonly hasActiveFilters = computed(() => {
    return !!(this.dateFrom() || this.dateTo() || this.transactionType());
  });

  readonly totalPages = computed(() => {
    const meta = this.transactionsMeta();
    if (!meta) return 1;
    return Math.ceil(meta.total / this.pageSize());
  });

  readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const pages: number[] = [];
    
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  });

  constructor() {
    this.dateFromControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(val => {
      this.dateFrom.set(val || undefined);
      this.page.set(1);
      this.applyFilters();
    });

    this.dateToControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(val => {
      this.dateTo.set(val || undefined);
      this.page.set(1);
      this.applyFilters();
    });

    this.typeControl.valueChanges.subscribe(val => {
      this.transactionType.set(val || undefined);
      this.page.set(1);
      this.applyFilters();
    });

    effect(() => {
      const txns = this.transactions();
      if (txns && txns.length > 0) {
        if (this.balanceChart) {
          this.updateBalanceChart(txns);
        } else if (this.balanceChartCanvas) {
          setTimeout(() => this.createBalanceChart(txns), 100);
        }
      }
    });
  }

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const accountId = params['id'];
        if (accountId) {
          this.id = accountId;
          this.loadAccountDetails();
        }
      });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.balanceChart?.destroy();
  }

  loadAccountDetails(): void {
    if (!this.id) return;

    this.loading.set(true);
    this.error.set(null);
    
    this.balanceChart?.destroy();
    this.balanceChart = undefined;

    this.accountsService.getAccountById(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (account: any) => {
          this.account.set(account);
          this.accountsService.selectAccount(account.id);
          this.loadTransactions();
          this.loading.set(false);
        },
        error: (err: any) => {
          this.error.set('Failed to load account details. Please try again.');
          this.loading.set(false);
          console.error('Error loading account:', err);
        }
      });
  }

  loadTransactions(): void {
    if (!this.id) return;

    this.accountsService.getTransactions(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const txns = response.data || [];
          this.transactions.set(txns);
          this.applyFilters();
          
          if (txns.length > 0 && !this.balanceChart) {
            setTimeout(() => {
              if (this.balanceChartCanvas) {
                this.createBalanceChart(txns);
              }
            }, 200);
          }
        },
        error: (err: any) => {
          console.error('Error loading transactions:', err);
        }
      });
  }

  private applyFilters(): void {
    let filtered = [...this.transactions()];
    const accountId = this.account()?.id;

    if (this.dateFrom()) {
      const fromDate = new Date(this.dateFrom()!);
      filtered = filtered.filter(txn => {
        const txnDate = new Date(txn.createdDate);
        return txnDate >= fromDate;
      });
    }

    if (this.dateTo()) {
      const toDate = new Date(this.dateTo()!);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(txn => {
        const txnDate = new Date(txn.createdDate);
        return txnDate <= toDate;
      });
    }

    if (this.transactionType() && accountId) {
      filtered = filtered.filter(txn => {
        const isIncoming = txn.recipientBill?.uuid === accountId;
        if (this.transactionType() === TransactionType.INCOMING) {
          return isIncoming;
        } else {
          return !isIncoming;
        }
      });
    }

    const total = filtered.length;
    const pageSize = this.pageSize();
    const page = this.page();
    const start = (page - 1) * pageSize;
    const paginatedData = filtered.slice(start, start + pageSize);

    this.filteredTransactions.set(paginatedData);
    this.transactionsMeta.set({
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize)
    });
  }

  resetFilters(): void {
    this.dateFromControl.setValue(null, { emitEvent: false });
    this.dateToControl.setValue(null, { emitEvent: false });
    this.typeControl.setValue(null, { emitEvent: false });
    this.dateFrom.set(undefined);
    this.dateTo.set(undefined);
    this.transactionType.set(undefined);
    this.page.set(1);
    this.applyFilters();
  }

  setPage(p: number): void {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
      this.applyFilters();
    }
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.applyFilters();
  }

  toggleAccountNumber(): void {
    this.showFullAccountNumber.update(v => !v);
  }

  async copyAccountNumber(): Promise<void> {
    const accountNumber = this.account()?.accountNumber;
    if (!accountNumber) return;

    try {
      await navigator.clipboard.writeText(accountNumber);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = accountNumber;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2000);
    }
  }

  downloadPdf(transactionId: string): void {
    this.downloadingPdf.set(transactionId);
    
    this.transactionService.downloadConfirmation(transactionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `transaction-${transactionId}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
          this.downloadingPdf.set(null);
        },
        error: (err) => {
          console.error('Failed to download PDF:', err);
          this.downloadingPdf.set(null);
        }
      });
  }

  getTransactionType(transaction: AccountTransaction): 'incoming' | 'outgoing' {
    const accountId = this.account()?.id;
    return transaction.recipientBill?.uuid === accountId ? 'incoming' : 'outgoing';
  }

  private createBalanceChart(transactions: AccountTransaction[]): void {
    if (!this.balanceChartCanvas) return;

    const ctx = this.balanceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const currentAccountId = this.account()?.id;
    if (!currentAccountId) return;

    const balanceHistory = this.calculateBalanceHistory(transactions, currentAccountId);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: balanceHistory.map(d => d.date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: '2-digit'
        })),
        datasets: [{
          label: 'Account Balance',
          data: balanceHistory.map(d => d.balance),
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#4f46e5',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            callbacks: {
              label: (context) => {
                const currency = this.account()?.currency || 'USD';
                const value = context.parsed?.y ?? 0;
                return `Balance: ${value.toLocaleString('en-US', { style: 'currency', currency })}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: (value) => {
                const currency = this.account()?.currency || 'USD';
                return Number(value).toLocaleString('en-US', { style: 'currency', currency, minimumFractionDigits: 0 });
              }
            }
          },
          x: {
            ticks: { maxRotation: 45, minRotation: 45 }
          }
        }
      }
    };

    this.balanceChart = new Chart(ctx, config);
  }

  private updateBalanceChart(transactions: AccountTransaction[]): void {
    if (!this.balanceChart) return;

    const currentAccountId = this.account()?.id;
    if (!currentAccountId) return;

    const balanceHistory = this.calculateBalanceHistory(transactions, currentAccountId);

    this.balanceChart.data.labels = balanceHistory.map(d => d.date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    }));
    this.balanceChart.data.datasets[0].data = balanceHistory.map(d => d.balance);
    this.balanceChart.update();
  }

  private calculateBalanceHistory(transactions: AccountTransaction[], accountId: string): { date: Date; balance: number }[] {
    const sortedTxns = [...transactions].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdDate).getTime();
      const dateB = new Date(b.updatedAt || b.createdDate).getTime();
      return dateA - dateB;
    });

    const currentBalance = this.account()?.balance || 0;
    const reversedTxns = [...sortedTxns].reverse();
    let balance = currentBalance;
    
    for (const txn of reversedTxns) {
      const amount = parseFloat(txn.amountMoney || '0');
      if (txn.recipientBill?.uuid === accountId) {
        balance -= amount;
      } else if (txn.senderBill?.uuid === accountId) {
        balance += amount;
      }
    }
    
    let runningBalance = balance;
    const balanceHistory: { date: Date; balance: number }[] = [];
    
    for (const txn of sortedTxns) {
      const amount = parseFloat(txn.amountMoney || '0');
      if (txn.recipientBill?.uuid === accountId) {
        runningBalance += amount;
      } else if (txn.senderBill?.uuid === accountId) {
        runningBalance -= amount;
      }
      
      balanceHistory.push({
        date: new Date(txn.updatedAt || txn.createdDate),
        balance: runningBalance
      });
    }

    return balanceHistory;
  }
}
