import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownOption {
  id: string | number;
  label: string;
  value?: any;
}

@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container">
      <h3>{{ label }}</h3>
      
      <input 
        class="search-input"
        type="text" 
        placeholder="Search..."
        (keyup)="updateSearch($any($event).target.value)"
      />
      
      <button (click)="isOpen.set(!isOpen())">
        {{ isOpen() ? 'Hide List' : 'Show List' }}
      </button>

      <ul *ngIf="isOpen()" class="list">
        <li *ngIf="filteredOptions().length === 0" class="empty">
          No items found
        </li>
        <li 
          *ngFor="let item of filteredOptions()" 
          (click)="selectItem(item)"
          class="list-item"
        >
          {{ item.label }}
        </li>
      </ul>

      <div *ngIf="selected()" class="selected">
        Selected: <strong>{{ selected().label }}</strong>
      </div>
    </div>
  `,
  styles: [`
    .container {
      border: 2px solid #ccc;
      padding: 15px;
      max-width: 300px;
    }

    h3 {
      margin-top: 0;
      color: #333;
    }

    .search-input {
      width: 100%;
      padding: 8px;
      font-size: 14px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
      margin-bottom: 10px;
    }

    .search-input:focus {
      outline: 2px solid blue;
    }

    button {
      width: 100%;
      padding: 8px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-bottom: 10px;
    }

    button:hover {
      background: #0056b3;
    }

    .list {
      border: 1px solid #ddd;
      list-style: none;
      padding: 0;
      margin: 0;
      max-height: 200px;
      overflow-y: auto;
    }

    .list-item {
      padding: 10px;
      border-bottom: 1px solid #eee;
      cursor: pointer;
    }

    .list-item:hover {
      background: #f0f0f0;
    }

    .list-item:last-child {
      border-bottom: none;
    }

    .empty {
      padding: 10px;
      color: #999;
      text-align: center;
    }

    .selected {
      margin-top: 10px;
      padding: 10px;
      background: #e7f3ff;
      border-left: 4px solid #007bff;
    }
  `]
})
export class SearchableDropdownComponent {
  @Input() label: string = 'Select Option';
  @Input() options: DropdownOption[] = [];
  @Output() selectionChange = new EventEmitter<DropdownOption>();

  searchTerm = signal('');
  isOpen = signal(false);
  selected = signal<DropdownOption | null>(null);

  filteredOptions = computed(() => {
    const search = this.searchTerm().toLowerCase();
    
    if (search === '') {
      return this.options;
    }

    return this.options.filter(opt => {
      const label = String(opt.label).toLowerCase();
      return label.includes(search);
    });
  });

  updateSearch(value: string) {
    console.log('Input value:', value);
    this.searchTerm.set(value);
    console.log('Search term updated to:', this.searchTerm());
    console.log('Filtered results:', this.filteredOptions());
  }

  selectItem(item: DropdownOption) {
    console.log('Selected item:', item);
    this.selected.set(item);
    this.selectionChange.emit(item);
    this.isOpen.set(false);
    this.searchTerm.set('');
  }
}
