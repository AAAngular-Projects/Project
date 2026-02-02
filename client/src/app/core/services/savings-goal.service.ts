import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SavingsGoal,
  CreateSavingsGoal,
  UpdateSavingsGoal,
  DepositWithdrawSavingsGoal,
} from '../models/savings-goal.model';

@Injectable({
  providedIn: 'root'
})
export class SavingsGoalService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:4000/bank';

  getSavingsGoals(): Observable<SavingsGoal[]> {
    return this.http.get<SavingsGoal[]>(`${this.API_URL}/SavingsGoals`);
  }

  getSavingsGoalById(uuid: string): Observable<SavingsGoal> {
    return this.http.get<SavingsGoal>(`${this.API_URL}/SavingsGoals/${uuid}`);
  }

  createSavingsGoal(data: CreateSavingsGoal): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.API_URL}/SavingsGoals/create`, data);
  }

  updateSavingsGoal(uuid: string, data: UpdateSavingsGoal): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/SavingsGoals/${uuid}`, data);
  }

  depositToSavingsGoal(uuid: string, data: DepositWithdrawSavingsGoal): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.API_URL}/SavingsGoals/${uuid}/deposit`, data);
  }

  withdrawFromSavingsGoal(uuid: string, data: DepositWithdrawSavingsGoal): Observable<SavingsGoal> {
    return this.http.post<SavingsGoal>(`${this.API_URL}/SavingsGoals/${uuid}/withdraw`, data);
  }

  deleteSavingsGoal(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/SavingsGoals/${uuid}`);
  }
}
