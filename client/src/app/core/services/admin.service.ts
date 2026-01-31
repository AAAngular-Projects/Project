import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface UserDto {
  uuid: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  createdAt: string;
  userAuth?: {
    role: string;
    pinCode?: number;
    lastSuccessfulLoggedDate?: string;
    lastLogoutDate?: string;
  };
}

export interface UserListDto {
  users: UserDto[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Signals for reactive state management
  users = signal<UserDto[]>([]);
  totalUsers = signal<number>(0);
  isLoading = signal<boolean>(false);

  getAllUsers(): Observable<UserListDto> {
    this.isLoading.set(true);
    return this.http.get<UserListDto>(`${this.apiUrl}/Users/admin/all`);
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.getAllUsers().subscribe({
      next: (data) => {
        this.users.set(data.users);
        this.totalUsers.set(data.total);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load users:', error);
        this.isLoading.set(false);
      }
    });
  }

  updateUserRole(uuid: string, role: string): Observable<UserDto> {
    return this.http.patch<UserDto>(`${this.apiUrl}/Users/admin/${uuid}/role`, { role });
  }

  deleteUser(uuid: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/Users/admin/${uuid}`);
  }

  createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    currency: string;
  }): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.apiUrl}/Users/admin/create`, userData);
  }
}
