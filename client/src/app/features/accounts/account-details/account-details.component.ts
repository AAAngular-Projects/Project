import { Component, Input, OnInit, OnDestroy, signal, effect, AfterViewInit, ViewChild, ElementRef, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountsService } from '@core/services/accounts.service';
import { Account, AccountTransaction } from '@core/models';
import { MaskAccountNumberPipe } from '@shared/pipes/mask-account-number.pipe';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-account-details',
  standalone: true,
  imports: [CommonModule, FormsModule, MaskAccountNumberPipe],
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.scss']
})
export class AccountDetailsComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly accountsService = inject(AccountsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  
  @Input() id?: string;
  @ViewChild('balanceChart') balanceChartCanvas!: ElementRef<HTMLCanvasElement>;

  account = signal<Account | null>(null);
  transactions = signal<AccountTransaction[]>([]);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  private chart?: Chart;

  constructor() {
    effect(() => {
      const txns = this.transactions();
      if (txns && txns.length > 0 && this.chart) {
        this.updateChart(txns);
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
    if (this.chart) {
      this.chart.destroy();
    }
  }

  loadAccountDetails(): void {
    if (!this.id) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }

    this.accountsService.getAccountById(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (account: any) => {
          this.account.set(account);
          this.accountsService.selectAccount(account.id);
          this.loadTransactions(account.id);
          this.loading.set(false);
        },
        error: (err: any) => {
          this.error.set('Failed to load account details. Please try again.');
          this.loading.set(false);
          console.error('Error loading account:', err);
        }
      });
  }

  loadTransactions(accountId: string): void {
    this.accountsService.getTransactions(accountId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (response: any) => {
        const txns = response.data || [];
        this.transactions.set(txns);
        
        if (txns.length > 0 && !this.chart) {
          setTimeout(() => {
            if (this.balanceChartCanvas) {
              this.createChart(txns);
            }
          }, 200);
        }
      },
      error: (err: any) => {
        console.error('Error loading transactions:', err);
      }
    });
  }

  private createChart(transactions: AccountTransaction[]): void {
    if (!this.balanceChartCanvas) return;

    const ctx = this.balanceChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const currentAccountId = this.account()?.id;
    if (!currentAccountId) return;

    const sortedTxns = [...transactions].sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdDate).getTime();
      const dateB = new Date(b.updatedAt || b.createdDate).getTime();
      return dateA - dateB;
    });

    const currentBalance = this.account()?.balance || 0;
    const reversedTxns = [...sortedTxns].reverse();
    let balance = currentBalance;
    const balanceHistory: { date: Date; balance: number }[] = [];
    
    for (const txn of reversedTxns) {
      const amount = parseFloat(txn.amountMoney || '0');
      if (txn.recipientBill?.uuid === currentAccountId) {
        balance -= amount;
      } else if (txn.senderBill?.uuid === currentAccountId) {
        balance += amount;
      }
    }
    
    let runningBalance = balance;
    for (const txn of sortedTxns) {
      const amount = parseFloat(txn.amountMoney || '0');
      if (txn.recipientBill?.uuid === currentAccountId) {
        runningBalance += amount;
      } else if (txn.senderBill?.uuid === currentAccountId) {
        runningBalance -= amount;
      }
      
      balanceHistory.push({
        date: new Date(txn.updatedAt || txn.createdDate),
        balance: runningBalance
      });
    }

    console.log('Chart data points:', balanceHistory.length);

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
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: { size: 12, family: 'Inter, sans-serif' },
              color: '#64748b'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#4f46e5',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const currency = this.account()?.currency || 'USD';
                const value = context.parsed?.y ?? 0;
                return `Balance: ${value.toLocaleString('en-US', { 
                  style: 'currency', 
                  currency: currency 
                })}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                const currency = this.account()?.currency || 'USD';
                return Number(value).toLocaleString('en-US', { 
                  style: 'currency', 
                  currency: currency,
                  minimumFractionDigits: 0
                });
              },
              font: { size: 11, family: 'Inter, sans-serif' },
              color: '#64748b'
            },
            grid: {
              color: '#e2e8f0'
            }
          },
          x: {
            ticks: {
              font: { size: 11, family: 'Inter, sans-serif' },
              color: '#64748b',
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              display: false
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(transactions: AccountTransaction[]): void {
    if (!this.chart) return;

    const currentAccountId = this.account()?.id;
    if (!currentAccountId) return;

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
      if (txn.recipientBill?.uuid === currentAccountId) {
        balance -= amount;
      } else if (txn.senderBill?.uuid === currentAccountId) {
        balance += amount;
      }
    }
    
    let runningBalance = balance;
    const balanceHistory: { date: Date; balance: number }[] = [];
    
    for (const txn of sortedTxns) {
      const amount = parseFloat(txn.amountMoney || '0');
      if (txn.recipientBill?.uuid === currentAccountId) {
        runningBalance += amount;
      } else if (txn.senderBill?.uuid === currentAccountId) {
        runningBalance -= amount;
      }
      
      balanceHistory.push({
        date: new Date(txn.updatedAt || txn.createdDate),
        balance: runningBalance
      });
    }

    this.chart.data.labels = balanceHistory.map(d => d.date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    }));
    this.chart.data.datasets[0].data = balanceHistory.map(d => d.balance);
    this.chart.update();
  }
}
