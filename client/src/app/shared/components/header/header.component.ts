import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services';
import { RoleType } from '../../../core/models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);
  
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;
  
  isAdmin(): boolean {
    const user = this.currentUser();
    console.log('Current user for isAdmin check:', user);
    console.log('User Auth:', user?.userAuth);
    console.log('User Auth Role:', user?.userAuth?.role);
    console.log('User Role:', user?.role);
    
    // Check multiple possible locations for the role
    const roleFromUserAuth = user?.userAuth?.role;
    const roleFromUser = user?.role;
    const role = roleFromUserAuth || roleFromUser;
    
    console.log('Final role:', role);
    
    // Use string comparison to avoid type issues
    return role === 'ADMIN_ROLE' || role === 'ROOT_ROLE' || 
           role === RoleType.ADMIN as string || role === RoleType.ROOT as string;
  }
  
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Logged out successfully');
      },
      error: (error) => {
        console.error('Logout failed:', error);
        // Still clear local storage and redirect on error
        this.authService.logoutLocal();
      }
    });
  }
}
