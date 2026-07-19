import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';
import {
  NgbTypeaheadModule,
  NgbTypeaheadSelectItemEvent
} from '@ng-bootstrap/ng-bootstrap';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap
} from 'rxjs';
import { ISearchItem } from './search-item';

@Component({
  selector: 'app-type-searchbox',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbTypeaheadModule
  ],
  templateUrl: './type-searchbox.html',
  styleUrl: './type-searchbox.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TypeSearchbox),
      multi: true
    }
  ]
})
export class TypeSearchbox implements ControlValueAccessor,OnInit,OnDestroy {

  @Input() placeholder = 'Type to search';
  @Input() minimumCharacters = 2;
  @Input() debounceMilliseconds = 300;
  @Input() searchFunction: (searchText:string) => Observable<ISearchItem[]> =
    () => of([]);

  @Output() itemSelected = new EventEmitter<ISearchItem | null>();

  searchControl = new FormControl<any>('');

  isSearching = false;
  searchCompleted = false;
  hasResults = true;
  searchFailed = false;

  private destroy$ = new Subject<void>();

  private onChange: (value:ISearchItem | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.onChange(null);
          this.itemSelected.emit(null);
        }
      });
  }

  search = (text$:Observable<string>): Observable<ISearchItem[]> => {
    return text$.pipe(
      debounceTime(this.debounceMilliseconds),
      distinctUntilChanged(),

      switchMap(searchText => {
        const text = searchText.trim();

        this.searchCompleted = false;
        this.hasResults = true;
        this.searchFailed = false;

        if (text.length < this.minimumCharacters) {
          this.isSearching = false;
          return of([]);
        }

        this.isSearching = true;

        return this.searchFunction(text).pipe(
          tap(items => {
            this.searchCompleted = true;
            this.hasResults = items.length > 0;
            this.searchFailed = false;
          }),

          catchError(() => {
            this.searchCompleted = true;
            this.hasResults = false;
            this.searchFailed = true;
            return of([]);
          }),

          finalize(() => {
            this.isSearching = false;
          })
        );
      })
    );
  };

  itemFormatter = (item:ISearchItem | string): string => {
    if (typeof item === 'string') {
      return item;
    }

    return item ? `${item.Name} (${item.Id})` : '';
  };

  selectItem(event:NgbTypeaheadSelectItemEvent): void {
    const item = event.item as ISearchItem;

    this.onChange(item);
    this.itemSelected.emit(item);

    this.searchCompleted = false;
    this.hasResults = true;
    this.searchFailed = false;
  }

  scrollActiveItem(): void {
    setTimeout(() => {
      const menu = document.querySelector(
        'ngb-typeahead-window.dropdown-menu'
      ) as HTMLElement | null;

      const activeItem = menu?.querySelector(
        '.dropdown-item.active'
      ) as HTMLElement | null;

      if (!menu || !activeItem) {
        return;
      }

      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const visibleBottom = menu.scrollTop + menu.clientHeight;

      if (itemTop < menu.scrollTop) {
        menu.scrollTop = itemTop;
      } else if (itemBottom > visibleBottom) {
        menu.scrollTop = itemBottom - menu.clientHeight;
      }
    });
  }

  markTouched(): void {
    this.onTouched();
  }

  writeValue(value:ISearchItem | null): void {
    this.searchControl.setValue(value ?? '',{
      emitEvent: false
    });
  }

  registerOnChange(fn:(value:ISearchItem | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn:() => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled:boolean): void {
    if (isDisabled) {
      this.searchControl.disable({
        emitEvent: false
      });
    } else {
      this.searchControl.enable({
        emitEvent: false
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}