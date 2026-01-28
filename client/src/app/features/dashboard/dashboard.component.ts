import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <h1>Welcome to Bank Dashboard</h1>
      <p>You are successfully logged in!</p>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      text-align: center;
      
      h1 {
        color: #102937;
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      
      p {
        color: #124d54;
        font-size: 1.125rem;
      }
    }
  `]
})
export class DashboardComponent {}
