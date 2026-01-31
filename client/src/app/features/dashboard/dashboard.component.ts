import { Component, inject, signal, effect, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, DestroyRef } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService, AuthService } from '../../core/services';
import { Chart, registerables } from 'chart.js';
import { ExchangeRateChartComponent } from './exchange-rate-chart/exchange-rate-chart.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, ExchangeRateChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  
  @ViewChild('balanceChart', { static: false }) balanceChartRef!: ElementRef<HTMLCanvasElement>;
  
  private chart: Chart | null = null;
  
  // Resources from service (using Angular Resource API)
  accountBalance = this.dashboardService.accountBalance;
  availableFunds = this.dashboardService.availableFunds;
  bills = this.dashboardService.bills;
  balanceHistory = this.dashboardService.balanceHistory;
  recentTransactions = this.dashboardService.recentTransactions;
  
  // Current user from auth service
  currentUser = this.authService.currentUser;
  
  constructor() {
    effect(() => {
      const history = this.balanceHistory();
      if (history && Array.isArray(history) && history.length > 0) {
        if (this.balanceChartRef?.nativeElement) {
          setTimeout(() => this.createOrUpdateChart(history), 100);
        }
      }
    });
  }
  
  ngOnInit(): void {
    this.dashboardService.loadDashboardData();
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => {
      const history = this.balanceHistory();
      if (history && Array.isArray(history) && history.length > 0) {
        this.createOrUpdateChart(history);
      }
    }, 500);
  }
  
  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
  
  private createOrUpdateChart(data: any[]): void {
    if (!this.balanceChartRef?.nativeElement) return;
    if (!data || data.length === 0) return;
    
    const ctx = this.balanceChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }
    
    // Create new chart
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((item, index) => {
          if (item.date) {
            return new Date(item.date).toLocaleDateString();
          }
          return `Point ${index + 1}`;
        }),
        datasets: [{
          label: 'Account Balance',
          data: data.map(item => Number(item.balance) || 0),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
                return '$' + Number(value).toLocaleString();
              }
            }
          }
        }
      }
    });
  }
  
  navigateToTransactions(): void {
    this.router.navigate(['/transactions']);
  }
  
  navigateToAccounts(): void {
    this.router.navigate(['/accounts']);
  }
  
  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }
  
  makeTransfer(): void {
    // TODO: Implement transfer functionality
    console.log('Make transfer clicked');
  }
}
