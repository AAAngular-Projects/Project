import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CurrencyOption, CurrencyResponse } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CurrencyService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  getAvailableCurrencies(take: number = 50): Observable<CurrencyOption[]> {
    const params = new HttpParams().set('page', '1').set('take', `${take}`);

    return this.http
      .get<CurrencyResponse>(`${this.API_URL}/Currencies`, { params })
      .pipe(map((response) => response.data));
  }
}
