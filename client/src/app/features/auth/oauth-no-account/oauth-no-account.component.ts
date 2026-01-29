import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-oauth-no-account',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-no-account.component.html',
  styleUrls: ['./oauth-no-account.component.scss']
})
export class OauthNoAccountComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly reason = signal<string>('user-not-found');

  readonly headline = computed(() =>
    this.reason() === 'user-not-found'
      ? 'We couldn\'t match your Google account'
      : 'We couldn\'t complete Google sign in'
  );

  readonly description = computed(() =>
    this.reason() === 'user-not-found'
      ? 'Your Google email is not linked to a banking profile yet. Ask an administrator to invite you or use a different account.'
      : 'Something interrupted the Google sign-in flow. Head back to the login page and try again.'
  );

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const reasonParam = params.get('reason');
      if (reasonParam) {
        this.reason.set(reasonParam);
      }
    });
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }

  requestAccess(): void {
    window.location.href = 'mailto:support@bank.com?subject=Bank%20access%20request';
  }
}
