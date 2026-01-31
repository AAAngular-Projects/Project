import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isPlatformBrowser(platformId)) {
        authService.logoutLocal();
      }

      return throwError(() => error);
    })
  );
};
