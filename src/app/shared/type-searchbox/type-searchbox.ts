import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
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
  defer,
  distinctUntilChanged,
  finalize,
  map,
  merge,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap,
  timer
} from 'rxjs';
import { ISearchItem } from './search-item';

type SearchAction =
  | {
      reset: true;
    }
  | {
      reset: false;
      text: string;
    };

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
export class TypeSearchbox implements ControlValueAccessor,OnInit,OnChanges,OnDestroy {

  @ViewChild('searchInput')
  private searchInput?: ElementRef<HTMLInputElement>;

  @Input() placeholder = 'Type to search';
  @Input() minimumCharacters = 2;
  @Input() debounceMilliseconds = 300;
  @Input() searchEnabled = true;
  @Input() searchContext: unknown = null;
  @Input() resetToken: unknown = null;

  @Input() searchingText = 'Searching...';
  @Input() noResultsText = 'No matching records found.';
  @Input() searchFailedText = 'Search failed. Please try again.';

  @Input() searchProvider:
    (searchText:string,searchContext:unknown) => Observable<ISearchItem[]> =
    () => of([]);

  @Input() selectionGuard:
    (item:ISearchItem,searchContext:unknown) => boolean =
    () => true;

  @Input() displayWith:
    (item:ISearchItem) => string =
    item => item.Name;

  @Output() itemSelected = new EventEmitter<ISearchItem>();
  @Output() itemCleared = new EventEmitter<null>();

  searchControl = new FormControl<ISearchItem | string>('');

  isSearching = false;
  searchCompleted = false;
  hasResults = true;
  searchFailed = false;

  private selectedItem: ISearchItem | null = null;
  private activeRequestId = 0;

  private resetSearch$ = new Subject<void>();
  private destroy$ = new Subject<void>();

  private onChange: (value:ISearchItem | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value !== 'string') {
          return;
        }

        const hadSelectedItem = this.selectedItem !== null;

        this.selectedItem = null;
        this.onChange(null);

        if (hadSelectedItem) {
          this.itemCleared.emit(null);
        }
      });
  }

  ngOnChanges(changes:SimpleChanges): void {
    const resetTokenChanged =
      changes['resetToken'] &&
      !changes['resetToken'].firstChange;

    const searchDisabled =
      changes['searchEnabled'] &&
      !changes['searchEnabled'].firstChange &&
      changes['searchEnabled'].currentValue === false;

    if (resetTokenChanged || searchDisabled) {
      this.clearSelection(true);
    }
  }

  search = (text$:Observable<string>): Observable<ISearchItem[]> => {
    const searchActions$ = merge(
      text$.pipe(
        map(searchText => ({
          reset: false,
          text: searchText.trim()
        }) as SearchAction)
      ),
      this.resetSearch$.pipe(
        map(() => ({
          reset: true
        }) as SearchAction)
      )
    );

    return searchActions$.pipe(
      distinctUntilChanged((previous,current) => {
        if (previous.reset === false && current.reset === false) {
          return previous.text === current.text;
        }

        return false;
      }),

      switchMap(action => {
        this.invalidateActiveRequest();
        this.resetSearchStatus();

        if (action.reset==true) {
          return of([]);
        }

        if (
          !this.searchEnabled ||
          action.text.length < Math.max(0,this.minimumCharacters)
        ) {
          return of([]);
        }

        return timer(Math.max(0,this.debounceMilliseconds)).pipe(
          switchMap(() => {
            if (!this.searchEnabled) {
              return of([]);
            }

            return this.runSearch(action.text);
          })
        );
      }),

      takeUntil(this.destroy$)
    );
  };

  private runSearch(searchText:string): Observable<ISearchItem[]> {
    const requestId = ++this.activeRequestId;
    const currentContext = this.searchContext;

    this.isSearching = true;

    return defer(() =>
      this.searchProvider(searchText,currentContext)
    ).pipe(
      map(items => Array.isArray(items) ? items : []),

      tap(items => {
        if (requestId !== this.activeRequestId) {
          return;
        }

        this.searchCompleted = true;
        this.hasResults = items.length > 0;
        this.searchFailed = false;
      }),

      catchError(() => {
        if (requestId === this.activeRequestId) {
          this.searchCompleted = true;
          this.hasResults = false;
          this.searchFailed = true;
        }

        return of([]);
      }),

      finalize(() => {
        if (requestId === this.activeRequestId) {
          this.isSearching = false;
        }
      })
    );
  }

  itemFormatter = (
    item:ISearchItem | string | null
  ): string => {
    if (typeof item === 'string') {
      return item;
    }

    return item ? this.displayWith(item) : '';
  };

  selectItem(event:NgbTypeaheadSelectItemEvent): void {
    const item = event.item as ISearchItem;

    if (
      !this.searchEnabled ||
      !this.selectionGuard(item,this.searchContext)
    ) {
      event.preventDefault();
      return;
    }

    this.selectedItem = item;

    this.onChange(item);
    this.itemSelected.emit(item);

    this.resetSearchStatus();
  }

  scrollActiveItem(): void {
    setTimeout(() => {
      const input = this.searchInput?.nativeElement;

      if (!input) {
        return;
      }

      const popupReference =
        input.getAttribute('aria-controls') ??
        input.getAttribute('aria-owns');

      const popupId = popupReference?.split(' ')[0];

      if (!popupId) {
        return;
      }

      const menu = input.ownerDocument.getElementById(popupId);
      const activeItem = menu?.querySelector(
        '.dropdown-item.active'
      ) as HTMLElement | null;

      if (!menu || !activeItem) {
        return;
      }

      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const visibleTop = menu.scrollTop;
      const visibleBottom = visibleTop + menu.clientHeight;

      if (itemTop < visibleTop) {
        menu.scrollTop = itemTop;
      }
      else if (itemBottom > visibleBottom) {
        menu.scrollTop = itemBottom - menu.clientHeight;
      }
    });
  }

  markTouched(): void {
    this.onTouched();
  }

  writeValue(value:ISearchItem | string | null): void {
    this.cancelCurrentSearch();
    this.resetSearchStatus();

    this.selectedItem =
      value !== null && typeof value === 'object'
        ? value
        : null;

    this.searchControl.setValue(value ?? '',{
      emitEvent: false
    });
  }

  registerOnChange(
    fn:(value:ISearchItem | null) => void
  ): void {
    this.onChange = fn;
  }

  registerOnTouched(fn:() => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled:boolean): void {
    this.cancelCurrentSearch();
    this.resetSearchStatus();

    if (isDisabled) {
      this.searchControl.disable({
        emitEvent: false
      });
    }
    else {
      this.searchControl.enable({
        emitEvent: false
      });
    }
  }

  private clearSelection(emitCleared:boolean): void {
    this.selectedItem = null;

    this.cancelCurrentSearch();
    this.resetSearchStatus();

    this.searchControl.setValue('',{
      emitEvent: false
    });

    if (emitCleared) {
      this.onChange(null);
      this.itemCleared.emit(null);
    }
  }

  private cancelCurrentSearch(): void {
    this.activeRequestId++;
    this.isSearching = false;
    this.resetSearch$.next();
  }

  private invalidateActiveRequest(): void {
    this.activeRequestId++;
    this.isSearching = false;
  }

  private resetSearchStatus(): void {
    this.isSearching = false;
    this.searchCompleted = false;
    this.hasResults = true;
    this.searchFailed = false;
  }

  ngOnDestroy(): void {
    this.activeRequestId++;

    this.destroy$.next();
    this.destroy$.complete();
    this.resetSearch$.complete();
  }
}