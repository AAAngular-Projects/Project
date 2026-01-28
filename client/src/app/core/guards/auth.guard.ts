import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services';
import { StorageService } from '../services';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const storage = inject(StorageService);
  const router = inject(Router);

  // Double-check storage in case service didn't initialize properly
  const token = storage.getToken();
  const user = storage.getUser();
  
  if (token && user) {
    // Make sure the auth service has the user loaded
    if (!authService.isAuthenticated()) {
      // Force reload user from storage
      authService.loadUserFromStorage();
    }
    return true;
  }

  return router.createUrlTree(['/login']);
};
