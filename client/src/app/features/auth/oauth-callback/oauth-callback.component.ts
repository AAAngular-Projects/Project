import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services';
import { LoginPayload } from '../../../core/models';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-callback.component.html',
  styleUrls: ['./oauth-callback.component.scss']
})
export class OauthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  statusMessage = signal<string>('Finishing secure sign in...');

  ngOnInit(): void {
    this.route.queryParamMap.subscribe({
      next: (params) => {
        const payloadParam = params.get('payload');

        if (!payloadParam) {
          this.statusMessage.set('Missing sign-in payload. Please try again.');
          return;
        }

        try {
          const normalized = payloadParam.replace(/\s/g, '+');
          const decodedJson = atob(normalized);
          const payload = JSON.parse(decodedJson) as LoginPayload;

          this.authService.completeOAuthLogin(payload);
          this.statusMessage.set('Redirecting to your dashboard...');
          setTimeout(() => this.router.navigate(['/dashboard']), 800);
        } catch (error) {
          console.error('OAuth callback error:', error);
          this.statusMessage.set('Unable to complete Google sign in. Please try again.');
          setTimeout(() => this.router.navigate(['/login']), 1500);
        }
      }
    });
  }
}
