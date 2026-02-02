import { Component, OnInit, ViewChild, ElementRef, signal, computed, AfterViewInit, OnDestroy, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { environment } from '../../../../environments/environment';

Chart.register(...registerables);

interface Currency {
  uuid: string;
  name: string;
  currentExchangeRate: number;
  base: boolean;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-exchange-rate-chart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exchange-rate-chart.component.html',
  styleUrls: ['./exchange-rate-chart.component.scss']
})
export class ExchangeRateChartComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  
  @ViewChild('exchangeRateChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  exchangeRateHistory = signal<Currency[]>([]);
  currencies = signal<Currency[]>([]);
  selectedCurrencyId = signal<string>('');
  loading = signal(true);
  
  selectedCurrency = computed(() => 
    this.currencies().find(c => c.uuid === this.selectedCurrencyId())
  );
  
  private chart?: Chart;
  private readonly API_URL = environment.apiUrl;
  private viewInitialized = false;

  ngOnInit(): void {
    this.loadCurrencies();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    const history = this.exchangeRateHistory();
    const selectedCurrency = this.selectedCurrency();
    if (history && history.length > 0 && !this.chart && selectedCurrency) {
      setTimeout(() => this.createChart(history, selectedCurrency.name), 0);
    }
  }

  loadCurrencies(): void {
    this.http.get<any>(`${this.API_URL}/Currencies`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const currenciesList = response.data || [];
          
          const uniqueCurrencies = currenciesList.reduce((acc: Currency[], current: Currency) => {
            const existing = acc.find(c => c.name === current.name);
            if (!existing) {
              acc.push(current);
            } else {
              const currentDate = new Date(current.recordedAt).getTime();
              const existingDate = new Date(existing.recordedAt).getTime();
              if (currentDate > existingDate) {
                const index = acc.indexOf(existing);
                acc[index] = current;
              }
            }
            return acc;
          }, []);
          
          this.currencies.set(uniqueCurrencies);
          
          const usdCurrency = uniqueCurrencies.find((c: any) => c.name === 'USD');
          const defaultCurrency = usdCurrency || uniqueCurrencies[0];
          
          if (defaultCurrency) {
            this.selectedCurrencyId.set(defaultCurrency.uuid);
            this.loadExchangeRateHistory(defaultCurrency.uuid, defaultCurrency.name);
          } else {
            this.loading.set(false);
          }
        },
        error: (err) => {
          console.error('Error loading currencies:', err);
          this.loading.set(false);
        }
      });
  }

  onCurrencyChange(currencyId: string): void {
    const selectedCurrency = this.currencies().find(c => c.uuid === currencyId);
    if (selectedCurrency) {
      this.loading.set(true);
      this.loadExchangeRateHistory(currencyId, selectedCurrency.name);
    }
  }

  private loadExchangeRateHistory(currencyId: string, currencyName: string): void {
    this.http.get<Currency[]>(
      `${this.API_URL}/Currencies/${currencyId}/exchange-rate-history`
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          this.exchangeRateHistory.set(history);
          this.loading.set(false);
          
          if (this.chart) {
            this.chart.destroy();
            this.chart = undefined;
          }
          
          if (this.viewInitialized && history.length > 0) {
            setTimeout(() => this.createChart(history, currencyName), 0);
          }
        },
        error: (err) => {
          console.error('Error loading exchange rate history:', err);
          this.loading.set(false);
        }
      });
  }

  private createChart(history: Currency[], currencyName: string): void {
    if (!this.chartCanvas) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const sortedHistory = [...history].sort((a, b) => 
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: sortedHistory.map(h => 
          new Date(h.recordedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })
        ),
        datasets: [{
          label: `${currencyName} Exchange Rate`,
          data: sortedHistory.map(h => h.currentExchangeRate),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#10b981',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            callbacks: {
              label: (context) => {
                const value = context.parsed?.y ?? 0;
                return `Rate: ${value.toFixed(4)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: (value) => {
                return Number(value).toFixed(2);
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

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
