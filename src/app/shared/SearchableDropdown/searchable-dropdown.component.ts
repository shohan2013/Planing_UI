import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, Subject } from 'rxjs';

export interface DropdownOption {
  id: string | number;
  label: string;
  value?: any;
}

@Component({
  selector: 'app-searchable-dropdown',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dropdown-container">
      <label *ngIf="label" [for]="id">{{ label }}</label>
      
      <div class="dropdown-wrapper">
        <input
          #searchInput
          type="text"
          [id]="id"
          class="dropdown-search"
          [(ngModel)]="searchTerm"
          (click)="toggleDropdown()"
          placeholder="Search..."
          [attr.aria-expanded]="isOpen()"
          [disabled]="disabled"
        />
        
        <button
          class="dropdown-toggle"
          (click)="toggleDropdown()"
          [disabled]="disabled"
          [attr.aria-label]="'Toggle dropdown for ' + label"
        >
          <span class="chevron" [class.open]="isOpen()">▼</span>
        </button>

        <ul
          *ngIf="isOpen()"
          class="dropdown-menu"
          role="listbox"
        >
          <li
            *ngIf="filteredOptions().length === 0"
            class="dropdown-item disabled"
          >
            No options found
          </li>

          <li
            *ngFor="let option of filteredOptions(); let i = index"
            class="dropdown-item"
            [class.selected]="selectedOption()?.id === option.id"
            [class.highlight]="highlightedIndex() === i"
            (click)="selectOption(option)"
            (mouseenter)="setHighlightedIndex(i)"
            role="option"
            [attr.aria-selected]="selectedOption()?.id === option.id"
          >
            {{ option.label }}
          </li>
        </ul>

        <div
          *ngIf="isOpen()"
          class="dropdown-backdrop"
          (click)="closeDropdown()"
        ></div>
      </div>

      <small *ngIf="selectedOption()" class="selected-value">
        Selected: {{ selectedOption()?.label }}
      </small>
    </div>
  `,
  styles: [`
    .dropdown-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    label {
      font-weight: 500;
      font-size: 0.875rem;
      color: #374151;
    }

    .dropdown-wrapper {
      position: relative;
      width: 100%;
    }

    .dropdown-search {
      width: 100%;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }

    .dropdown-search:hover:not(:disabled) {
      border-color: #9ca3af;
    }

    .dropdown-search:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .dropdown-search:disabled {
      background-color: #f3f4f6;
      cursor: not-allowed;
      color: #9ca3af;
    }

    .dropdown-toggle {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .dropdown-toggle:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .chevron {
      display: inline-block;
      transition: transform 0.2s ease;
      color: #6b7280;
      font-size: 0.75rem;
    }

    .chevron.open {
      transform: rotate(180deg);
    }

    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      list-style: none;
      margin: 0.5rem 0 0 0;
      padding: 0.5rem 0;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 0.375rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      z-index: 10;
      max-height: 300px;
      overflow-y: auto;
    }

    .dropdown-item {
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background-color 0.15s ease;
      color: #374151;
    }

    .dropdown-item:hover:not(.disabled) {
      background-color: #f3f4f6;
    }

    .dropdown-item.highlight {
      background-color: #e5e7eb;
    }

    .dropdown-item.selected {
      background-color: #dbeafe;
      color: #1e40af;
      font-weight: 500;
    }

    .dropdown-item.disabled {
      cursor: not-allowed;
      color: #9ca3af;
      padding: 1rem;
      text-align: center;
    }

    .dropdown-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 5;
    }

    .selected-value {
      font-size: 0.75rem;
      color: #6b7280;
    }
  `]
})
export class SearchableDropdownComponent implements OnInit {
  @Input() id: string = 'dropdown';
  @Input() label: string = '';
  @Input() options: DropdownOption[] = [];
  @Input() disabled: boolean = false;
  @Input() placeholder: string = 'Search...';
  
  @Output() selectionChange = new EventEmitter<DropdownOption>();
  
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // Signals
  searchTerm = signal('');
  isOpen = signal(false);
  selectedOption = signal<DropdownOption | null>(null);
  highlightedIndex = signal(0);

  // Computed signals
  filteredOptions = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.options;
    
    return this.options.filter(opt =>
      opt.label.toLowerCase().includes(term) ||
      String(opt.id).toLowerCase().includes(term)
    );
  });

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(
        debounceTime(300)
      )
      .subscribe(term => {
        this.searchTerm.set(term);
        this.highlightedIndex.set(0);
      });
  }

  ngOnInit(): void {
    // Close dropdown when clicking outside
    document.addEventListener('click', this.handleClickOutside.bind(this));
  }

  toggleDropdown(): void {
    if (this.disabled) return;
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      setTimeout(() => this.searchInput?.nativeElement.focus());
    }
  }

  closeDropdown(): void {
    this.isOpen.set(false);
    this.searchTerm.set('');
  }

  selectOption(option: DropdownOption): void {
    this.selectedOption.set(option);
    this.selectionChange.emit(option);
    this.closeDropdown();
  }

  setHighlightedIndex(index: number): void {
    this.highlightedIndex.set(index);
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  private handleClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-wrapper')) {
      this.closeDropdown();
    }
  }
}
