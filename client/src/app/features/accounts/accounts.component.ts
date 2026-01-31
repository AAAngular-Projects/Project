import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AccountsListComponent } from './accounts-list/accounts-list.component';

/**
 * Master-Detail container for Accounts
 * Shows the accounts list (master) on the left
 * and the selected account details (detail) on the right via router-outlet
 */
@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [RouterOutlet, AccountsListComponent],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss']
})
export class AccountsComponent {}
