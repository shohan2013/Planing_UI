import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SearchableDropdownComponent, DropdownOption } from './searchable-dropdown.component';

@Component({
  selector: 'app-dropdown-demo',
  standalone: true,
  imports: [CommonModule, SearchableDropdownComponent],
  template: `
    <div class="demo-container">
      <h1>Searchable Dropdown Component</h1>
      
      <div class="demo-section">
        <h2>Basic Example</h2>
        <app-searchable-dropdown
          id="country-select"
          label="Select a Country"
          [options]="countries()"
          (selectionChange)="onCountrySelect($event)"
        ></app-searchable-dropdown>

        <div *ngIf="selectedCountry()" class="result-box">
          <p><strong>Selected Country:</strong> {{ selectedCountry()?.label }}</p>
          <p><strong>ID:</strong> {{ selectedCountry()?.id }}</p>
          <p><strong>Value:</strong> {{ selectedCountry()?.value }}</p>
        </div>
      </div>

      <div class="demo-section">
        <h2>Dynamic Options Example</h2>
        <app-searchable-dropdown
          id="user-select"
          label="Select a User"
          [options]="users()"
          (selectionChange)="onUserSelect($event)"
        ></app-searchable-dropdown>

        <div *ngIf="selectedUser()" class="result-box">
          <p><strong>Selected User:</strong> {{ selectedUser()?.label }}</p>
          <p><strong>Email:</strong> {{ selectedUser()?.value?.email }}</p>
        </div>
      </div>

      <div class="demo-section">
        <h2>Disabled State</h2>
        <app-searchable-dropdown
          id="disabled-select"
          label="Disabled Dropdown"
          [options]="countries()"
          [disabled]="true"
        ></app-searchable-dropdown>
      </div>
    </div>
  `,
  styles: [`
    .demo-container {
      max-width: 600px;
      margin: 2rem auto;
      padding: 2rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    h1 {
      color: #1f2937;
      margin-bottom: 2rem;
    }

    h2 {
      color: #374151;
      font-size: 1.125rem;
      margin-bottom: 1rem;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 0.5rem;
    }

    .demo-section {
      margin-bottom: 3rem;
    }

    .result-box {
      margin-top: 1rem;
      padding: 1rem;
      background-color: #f0fdf4;
      border-left: 4px solid #22c55e;
      border-radius: 0.375rem;
    }

    .result-box p {
      margin: 0.5rem 0;
      color: #166534;
      font-size: 0.875rem;
    }

    .result-box strong {
      color: #15803d;
    }
  `]
})
export class DropdownDemoComponent {
  // Signals for selected values
  selectedCountry = signal<DropdownOption | null>(null);
  selectedUser = signal<DropdownOption | null>(null);

  // Data signals
  countries = signal<DropdownOption[]>([
    { id: 1, label: 'United States', value: 'US' },
    { id: 2, label: 'Canada', value: 'CA' },
    { id: 3, label: 'Mexico', value: 'MX' },
    { id: 4, label: 'United Kingdom', value: 'UK' },
    { id: 5, label: 'Germany', value: 'DE' },
    { id: 6, label: 'France', value: 'FR' },
    { id: 7, label: 'Spain', value: 'ES' },
    { id: 8, label: 'Italy', value: 'IT' },
    { id: 9, label: 'Japan', value: 'JP' },
    { id: 10, label: 'Australia', value: 'AU' },
    { id: 11, label: 'Brazil', value: 'BR' },
    { id: 12, label: 'India', value: 'IN' },
  ]);

  users = signal<DropdownOption[]>([
    { id: 1, label: 'John Doe', value: { email: 'john@example.com', role: 'Admin' } },
    { id: 2, label: 'Jane Smith', value: { email: 'jane@example.com', role: 'User' } },
    { id: 3, label: 'Bob Johnson', value: { email: 'bob@example.com', role: 'Moderator' } },
    { id: 4, label: 'Alice Williams', value: { email: 'alice@example.com', role: 'User' } },
    { id: 5, label: 'Charlie Brown', value: { email: 'charlie@example.com', role: 'Editor' } },
  ]);

  onCountrySelect(option: DropdownOption): void {
    this.selectedCountry.set(option);
    console.log('Country selected:', option);
  }

  onUserSelect(option: DropdownOption): void {
    this.selectedUser.set(option);
    console.log('User selected:', option);
  }
}
