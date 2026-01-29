import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-auth-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-card.component.html',
  styleUrl: './auth-card.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class AuthCardComponent {}
