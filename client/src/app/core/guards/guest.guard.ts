import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services';
import { StorageService } from '../services';

export const guestGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  const authService = inject(AuthService);
  const storage = inject(StorageService);
  const router = inject(Router);

  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const token = storage.getToken();
  const user = storage.getUser();
  
  // If user is authenticated, redirect to dashboard
  if (token && user) {
    return router.createUrlTree(['/dashboard']);
  }

  // Allow access to login/register pages
  return true;
};
