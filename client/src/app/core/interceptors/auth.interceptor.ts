import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StorageService } from '../services';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  
  // Skip token injection during SSR
  if (!isPlatformBrowser(platformId)) {
    return next(req);
  }

  const storage = inject(StorageService);
  const token = storage.getToken();

  console.log('🔐 Auth Interceptor:', {
    url: req.url,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
  });

  // Clone request and add authorization header if token exists
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  } else {
    console.warn('⚠️ No token found for request to:', req.url);
  }

  return next(req);
};
