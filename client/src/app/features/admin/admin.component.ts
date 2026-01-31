import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AdminService, AuthService } from '../../core/services';
import type { UserDto } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Resources from service
  users = this.adminService.users;
  totalUsers = this.adminService.totalUsers;
  isLoading = this.adminService.isLoading;
  currentUser = this.authService.currentUser;

  // UI State
  selectedTab = signal<'overview' | 'users'>('overview');
  showCreateUserModal = signal<boolean>(false);
  showDeleteConfirm = signal<string | null>(null);
  showEditRoleModal = signal<UserDto | null>(null);
  selectedRole = signal<string>('');
  
  // Search state
  searchQuery = signal<string>('');
  showAutocomplete = signal<boolean>(false);
  
  // Filtered users based on search
  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const currentUserUuid = this.currentUser()?.uuid;
    
    // First, exclude the current user
    const usersWithoutCurrent = this.users().filter(user => user.uuid !== currentUserUuid);
    
    if (!query) {
      return usersWithoutCurrent;
    }
    
    return usersWithoutCurrent.filter(user => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const role = this.getRoleLabel(user.userAuth?.role || '').toLowerCase();
      
      return fullName.includes(query) || 
             email.includes(query) || 
             role.includes(query);
    });
  });

  // Overview Stats
  activeUsersCount = computed(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    return this.users().filter(user => {
      if (!user.userAuth?.lastSuccessfulLoggedDate) return false;
      return new Date(user.userAuth.lastSuccessfulLoggedDate) > thirtyDaysAgo;
    }).length;
  });

  newUsersCount = computed(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    return this.users().filter(user => {
      if (!user.createdAt) return false;
      return new Date(user.createdAt) > thirtyDaysAgo;
    }).length;
  });

  recentActivity = computed(() => {
    // Sort users by creation date or login date
    return [...this.users()]
      .sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  });
  
  // Autocomplete suggestions
  autocompleteSuggestions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query || query.length < 2) {
      return [];
    }
    
    const suggestions = new Set<string>();
    this.users().forEach(user => {
      const fullName = `${user.firstName} ${user.lastName}`;
      const email = user.email;
      const role = this.getRoleLabel(user.userAuth?.role || '');
      
      if (fullName.toLowerCase().includes(query)) {
        suggestions.add(fullName);
      }
      if (email.toLowerCase().includes(query)) {
        suggestions.add(email);
      }
      if (role.toLowerCase().includes(query)) {
        suggestions.add(role);
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  });

  // Form data for creating new user
  newUser = signal({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    currency: 'c0e8c3e5-dcab-4c77-879d-66c59794dfed' // Default USD currency
  });

  // Role types
  roleTypes = [
    { value: 'USER_ROLE', label: 'User' },
    { value: 'ADMIN_ROLE', label: 'Admin' }
  ];

  ngOnInit(): void {
    // Read tab from query params
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'users' || tab === 'overview') {
        this.selectedTab.set(tab);
      }
    });
    
    this.adminService.loadUsers();
  }

  switchTab(tab: 'overview' | 'users'): void {
    this.selectedTab.set(tab);
    // Update URL with query parameter
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  getRoleLabel(role: string): string {
    const roleMap: Record<string, string> = {
      'USER_ROLE': 'User',
      'ADMIN_ROLE': 'Admin',
      'ROOT_ROLE': 'Root'
    };
    return roleMap[role] || role;
  }

  getRoleClass(role: string): string {
    const roleClassMap: Record<string, string> = {
      'USER_ROLE': 'role-user',
      'ADMIN_ROLE': 'role-admin',
      'ROOT_ROLE': 'role-root'
    };
    return roleClassMap[role] || '';
  }

  canChangeRole(): boolean {
    const user = this.currentUser();
    // Check multiple possible locations for the role
    const roleFromUserAuth = user?.userAuth?.role;
    const roleFromUser = (user as any)?.role;
    const role = roleFromUserAuth || roleFromUser;
    console.log('canChangeRole check - Current user:', user);
    console.log('canChangeRole check - Role from userAuth:', roleFromUserAuth);
    console.log('canChangeRole check - Role from user:', roleFromUser);
    console.log('canChangeRole check - Final role:', role);
    console.log('canChangeRole check - Is ROOT?:', role === 'ROOT_ROLE');
    return role === 'ROOT_ROLE';
  }

  openEditRoleModal(user: UserDto): void {
    this.showEditRoleModal.set(user);
    this.selectedRole.set(user.userAuth?.role || 'USER_ROLE');
  }

  closeEditRoleModal(): void {
    this.showEditRoleModal.set(null);
    this.selectedRole.set('');
  }

  updateRole(): void {
    const user = this.showEditRoleModal();
    const newRole = this.selectedRole();
    
    if (!user || !newRole) return;

    this.adminService.updateUserRole(user.uuid, newRole).subscribe({
      next: () => {
        this.adminService.loadUsers();
        this.closeEditRoleModal();
        alert('Role updated successfully');
      },
      error: (error) => {
        console.error('Failed to update role:', error);
        alert('Failed to update role');
      }
    });
  }

  sendMessage(user: UserDto | null): void {
    if (!user) return;
    // For now, we'll just log or alert. In a real app, this would open a message modal or navigate to messages
    // Navigate to messages with pre-filled recipient could be an option if supported
    this.router.navigate(['/messages']);
    this.closeEditRoleModal();
  }

  onRoleChange(user: UserDto, newRole: string): void {
    if (!this.canChangeRole()) {
      alert('Only ROOT users can change roles');
      return;
    }

    this.adminService.updateUserRole(user.uuid, newRole).subscribe({
      next: () => {
        this.adminService.loadUsers();
        alert('Role updated successfully');
      },
      error: (error) => {
        console.error('Failed to update role:', error);
        alert('Failed to update role');
      }
    });
  }

  confirmDelete(uuid: string): void {
    this.showDeleteConfirm.set(uuid);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(null);
  }

  deleteUser(uuid: string): void {
    this.adminService.deleteUser(uuid).subscribe({
      next: () => {
        this.adminService.loadUsers();
        this.showDeleteConfirm.set(null);
        alert('User deleted successfully');
      },
      error: (error) => {
        console.error('Failed to delete user:', error);
        alert('Failed to delete user');
        this.showDeleteConfirm.set(null);
      }
    });
  }

  openCreateUserModal(): void {
    this.showCreateUserModal.set(true);
  }

  closeCreateUserModal(): void {
    this.showCreateUserModal.set(false);
    // Reset form
    this.newUser.set({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      currency: 'c0e8c3e5-dcab-4c77-879d-66c59794dfed'
    });
  }

  createUser(): void {
    const userData = this.newUser();
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
      alert('Please fill in all fields');
      return;
    }

    this.adminService.createUser(userData).subscribe({
      next: () => {
        this.adminService.loadUsers();
        this.closeCreateUserModal();
        alert('User created successfully');
      },
      error: (error) => {
        console.error('Failed to create user:', error);
        alert('Failed to create user: ' + (error.error?.message || 'Unknown error'));
      }
    });
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.showAutocomplete.set(input.value.length >= 2);
  }

  selectSuggestion(suggestion: string): void {
    this.searchQuery.set(suggestion);
    this.showAutocomplete.set(false);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.showAutocomplete.set(false);
  }

  onSearchBlur(): void {
    // Delay to allow click on suggestion
    setTimeout(() => {
      this.showAutocomplete.set(false);
    }, 200);
  }
}
