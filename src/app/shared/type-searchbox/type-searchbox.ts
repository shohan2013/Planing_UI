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
  concat,
  defer,
  distinctUntilChanged,
  EMPTY,
  filter,
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

export interface ISearchBinding {
  key: string;
  value: unknown;
  required?: boolean;
  label?: string;
  isMissing?: (value:unknown) => boolean;
}

interface SearchContextState {
  context: Record<string,unknown>;
  missingRequiredBindings: string[];
}

type SearchRequestAction = {
  reset: false;
  text: string;
  context: Record<string,unknown>;
  missingRequiredBindings: string[];
  version: number;
  clearResults: boolean;
};

type SearchAction =
  | {
      reset: true;
    }
  | SearchRequestAction;

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
  @Input() searchBindings: ISearchBinding[] = [];
  @Input() resetToken: unknown = null;

  @Input() searchingText = 'Searching...';
  @Input() noResultsText = 'No matching records found.';
  @Input() searchFailedText = 'Search failed. Please try again.';
  @Input() missingBindingsText = 'Please select {bindings}.';
  @Input() searchDisabledText = '';

  @Input() searchProvider:
    (
      searchText:string,
      searchContext:Record<string,unknown>
    ) => Observable<ISearchItem[]> =
    () => of([]);

  @Input() selectionGuard:
    (
      item:ISearchItem,
      searchContext:Record<string,unknown>
    ) => boolean =
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
  searchValidationMessage = '';

  private selectedItem: ISearchItem | null = null;
  private activeRequestId = 0;
  private searchVersion = 0;
  private searchBindingsSignature = '';

  private refreshSearch$ = new Subject<void>();
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

        if (hadSelectedItem) {
          this.onChange(null);
          this.itemCleared.emit(null);
        }
      });
  }

  ngOnChanges(changes:SimpleChanges): void {
    const resetTokenChanged =
      changes['resetToken'] &&
      !changes['resetToken'].firstChange;

    if (resetTokenChanged) {
      this.clearSelection(true);
      return;
    }

    let searchInputChanged = false;

    if (changes['searchBindings']) {
      const currentSignature =
        this.createSearchBindingsSignature();

      if (changes['searchBindings'].firstChange) {
        this.searchBindingsSignature = currentSignature;
      }
      else if (
        currentSignature !== this.searchBindingsSignature
      ) {
        this.searchBindingsSignature = currentSignature;
        searchInputChanged = true;
      }
    }

    const searchEnabledChanged =
      changes['searchEnabled'] &&
      !changes['searchEnabled'].firstChange &&
      changes['searchEnabled'].previousValue !==
      changes['searchEnabled'].currentValue;

    if (searchEnabledChanged) {
      searchInputChanged = true;
    }

    if (searchInputChanged) {
      this.reinitializeSearch();
    }
  }

  search = (
    text$:Observable<string>
  ): Observable<ISearchItem[]> => {
    const searchActions$ = merge(
      text$.pipe(
        map(searchText =>
          this.createSearchAction(searchText,false)
        )
      ),

      this.refreshSearch$.pipe(
        map(() =>
          this.createSearchAction(
            this.getCurrentSearchText(),
            true
          )
        )
      ),

      this.resetSearch$.pipe(
        map(() => ({
          reset: true
        }) as SearchAction)
      )
    );

    return searchActions$.pipe(
      distinctUntilChanged((previous,current) => {
        if (
          previous.reset === false &&
          current.reset === false
        ) {
          return (
            previous.text === current.text &&
            previous.version === current.version
          );
        }

        return false;
      }),

      switchMap(action => {
        this.invalidateActiveRequest();
        this.resetSearchStatus();

        if (action.reset==true) {
          return this.emptyResults();
        }

        if (action.clearResults) {
          return concat(
            this.emptyResults(),
            defer(() =>
              this.startSearch(action,true)
            )
          );
        }

        return this.startSearch(action,false);
      }),

      takeUntil(this.destroy$)
    );
  };

  private startSearch(
    action:SearchRequestAction,
    resultsAlreadyCleared:boolean
  ): Observable<ISearchItem[]> {
    if (!this.searchEnabled) {
      this.searchValidationMessage =
        this.searchDisabledText.trim();

      return resultsAlreadyCleared
        ? EMPTY
        : this.emptyResults();
    }

    if (
      action.text.length <
      Math.max(0,this.minimumCharacters)
    ) {
      return resultsAlreadyCleared
        ? EMPTY
        : this.emptyResults();
    }

    if (action.missingRequiredBindings.length > 0) {
      this.searchValidationMessage =
        this.createMissingBindingsMessage(
          action.missingRequiredBindings
        );

      return resultsAlreadyCleared
        ? EMPTY
        : this.emptyResults();
    }

    return timer(
      Math.max(0,this.debounceMilliseconds)
    ).pipe(
      switchMap(() => {
        if (
          action.version !== this.searchVersion ||
          !this.searchEnabled
        ) {
          return EMPTY;
        }

        return this.runSearch(
          action.text,
          action.context,
          action.version
        );
      })
    );
  }

  private runSearch(
    searchText:string,
    searchContext:Record<string,unknown>,
    searchVersion:number
  ): Observable<ISearchItem[]> {
    const requestId = ++this.activeRequestId;

    this.isSearching = true;

    return defer(() =>
      this.searchProvider(searchText,searchContext)
    ).pipe(
      map(items =>
        Array.isArray(items)
          ? items
          : []
      ),

      filter(() =>
        requestId === this.activeRequestId &&
        searchVersion === this.searchVersion
      ),

      tap(items => {
        this.searchCompleted = true;
        this.hasResults = items.length > 0;
        this.searchFailed = false;
      }),

      catchError(() => {
        if (
          requestId !== this.activeRequestId ||
          searchVersion !== this.searchVersion
        ) {
          return EMPTY;
        }

        this.searchCompleted = true;
        this.hasResults = false;
        this.searchFailed = true;

        return of([]);
      }),

      finalize(() => {
        if (
          requestId === this.activeRequestId &&
          searchVersion === this.searchVersion
        ) {
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
    const searchContext =
      this.createSearchContextState().context;

    if (
      !this.searchEnabled ||
      !this.selectionGuard(item,searchContext)
    ) {
      event.preventDefault();
      return;
    }

    this.selectedItem = item;

    this.onChange(item);
    this.itemSelected.emit(item);

    this.resetSearchStatus();
  }

  clear(): void {
    this.clearSelection(true);
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

      const menu =
        input.ownerDocument.getElementById(popupId);

      const activeItem = menu?.querySelector(
        '.dropdown-item.active'
      ) as HTMLElement | null;

      if (!menu || !activeItem) {
        return;
      }

      const itemTop = activeItem.offsetTop;
      const itemBottom =
        itemTop + activeItem.offsetHeight;
      const visibleTop = menu.scrollTop;
      const visibleBottom =
        visibleTop + menu.clientHeight;

      if (itemTop < visibleTop) {
        menu.scrollTop = itemTop;
      }
      else if (itemBottom > visibleBottom) {
        menu.scrollTop =
          itemBottom - menu.clientHeight;
      }
    });
  }

  markTouched(): void {
    this.onTouched();
  }

  writeValue(
    value:ISearchItem | string | null
  ): void {
    this.cancelCurrentSearch();
    this.resetSearchStatus();

    this.selectedItem =
      value !== null &&
      typeof value === 'object'
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

  private createSearchAction(
    searchText:string,
    clearResults:boolean
  ): SearchRequestAction {
    const searchContextState =
      this.createSearchContextState();

    return {
      reset: false,
      text: searchText.trim(),
      context: searchContextState.context,
      missingRequiredBindings:
        searchContextState.missingRequiredBindings,
      version: this.searchVersion,
      clearResults
    };
  }

  private createSearchContextState():
    SearchContextState {
    const context: Record<string,unknown> = {};
    const missingRequiredBindings: string[] = [];

    for (const binding of this.searchBindings ?? []) {
      const key = binding?.key?.trim();

      if (!key) {
        continue;
      }

      context[key] = binding.value;

      if (
        binding.required === true &&
        this.isBindingMissing(binding)
      ) {
        const label =
          binding.label?.trim() || key;

        if (
          !missingRequiredBindings.includes(label)
        ) {
          missingRequiredBindings.push(label);
        }
      }
    }

    return {
      context,
      missingRequiredBindings
    };
  }

  private isBindingMissing(
    binding:ISearchBinding
  ): boolean {
    if (binding.isMissing) {
      return binding.isMissing(binding.value);
    }

    const value = binding.value;

    if (
      value === null ||
      value === undefined
    ) {
      return true;
    }

    if (
      typeof value === 'string' &&
      value.trim() === ''
    ) {
      return true;
    }

    if (
      Array.isArray(value) &&
      value.length === 0
    ) {
      return true;
    }

    return false;
  }

  private createMissingBindingsMessage(
    bindings:string[]
  ): string {
    let bindingNames = '';

    if (bindings.length === 1) {
      bindingNames = bindings[0];
    }
    else {
      bindingNames =
        `${bindings.slice(0,-1).join(', ')} and ` +
        bindings[bindings.length - 1];
    }

    if (
      this.missingBindingsText.includes(
        '{bindings}'
      )
    ) {
      return this.missingBindingsText.replace(
        '{bindings}',
        bindingNames
      );
    }

    return (
      `${this.missingBindingsText} ${bindingNames}`
    ).trim();
  }

  private createSearchBindingsSignature(): string {
    return (this.searchBindings ?? [])
      .map(binding => {
        const key = binding?.key?.trim() ?? '';
        const label =
          binding?.label?.trim() ?? '';
        const required =
          binding?.required === true;
        const missing =
          required
            ? this.isBindingMissing(binding)
            : false;

        return [
          key,
          label,
          required,
          missing,
          this.createValueSignature(
            binding?.value
          )
        ].join(':');
      })
      .join('|');
  }

  private createValueSignature(
    value:unknown,
    visited:WeakSet<object> =
      new WeakSet<object>()
  ): string {
    if (value === null) {
      return 'null';
    }

    if (value === undefined) {
      return 'undefined';
    }

    if (value instanceof Date) {
      return `date:${value.toISOString()}`;
    }

    if (Array.isArray(value)) {
      return `[${value
        .map(item =>
          this.createValueSignature(
            item,
            visited
          )
        )
        .join(',')}]`;
    }

    if (typeof value === 'object') {
      const objectValue = value as object;

      if (visited.has(objectValue)) {
        return '[circular]';
      }

      visited.add(objectValue);

      const record =
        value as Record<string,unknown>;

      const signature = Object.keys(record)
        .sort()
        .map(key =>
          `${key}:${this.createValueSignature(
            record[key],
            visited
          )}`
        )
        .join(',');

      visited.delete(objectValue);

      return `{${signature}}`;
    }

    return `${typeof value}:${String(value)}`;
  }

  private getCurrentSearchText(): string {
    const value = this.searchControl.value;

    if (typeof value === 'string') {
      return value;
    }

    if (
      value !== null &&
      typeof value === 'object'
    ) {
      return value.Name;
    }

    return '';
  }

  private reinitializeSearch(): void {
    const searchText =
      this.getCurrentSearchText();

    const hadSelectedItem =
      this.selectedItem !== null;

    this.selectedItem = null;

    if (hadSelectedItem) {
      this.onChange(null);
      this.itemCleared.emit(null);
    }

    this.searchControl.setValue(searchText,{
      emitEvent: false
    });

    this.searchVersion++;

    this.invalidateActiveRequest();
    this.resetSearchStatus();

    this.refreshSearch$.next();
  }

  private clearSelection(
    emitCleared:boolean
  ): void {
    const hadSelectedItem =
      this.selectedItem !== null;

    this.selectedItem = null;

    this.cancelCurrentSearch();
    this.resetSearchStatus();

    this.searchControl.setValue('',{
      emitEvent: false
    });

    if (emitCleared) {
      this.onChange(null);

      if (hadSelectedItem) {
        this.itemCleared.emit(null);
      }
    }
  }

  private emptyResults():
    Observable<ISearchItem[]> {
    return timer(0).pipe(
      map(() => [])
    );
  }

  private cancelCurrentSearch(): void {
    this.searchVersion++;
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
    this.searchValidationMessage = '';
  }

  ngOnDestroy(): void {
    this.searchVersion++;
    this.activeRequestId++;

    this.destroy$.next();
    this.destroy$.complete();

    this.refreshSearch$.complete();
    this.resetSearch$.complete();
  }
}