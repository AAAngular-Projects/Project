import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services';
import { StorageService } from '../services';

export const authGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const storage = inject(StorageService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const token = storage.getToken();
  const user = storage.getUser();
  
  if (token && user) {
    if (!authService.isAuthenticated()) {
      authService.loadUserFromStorage();
    }
    return true;
  }

  return router.createUrlTree(['/login']);
};
