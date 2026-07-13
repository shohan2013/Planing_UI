import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, switchMap, tap } from 'rxjs/operators';
import { BasePaginatedTableComponent } from '../base-paginated-table/base-paginated-table.component';
import { FilterState, ServerQueryRequest, ServerQueryResponse } from '../model/Common/Pagination/ServerQueryRequest';

@Component({ template: '' }) 
export abstract class ServerSideFilteredPaginatedComponent<T> extends BasePaginatedTableComponent<T> implements OnInit {
  protected router = inject(Router);
  protected route = inject(ActivatedRoute);

  /** 
   * Server overrides 
   * We intercept totalItems and paginatedItems from your BaseClass to prevent local slicing
   */
  protected serverTotalItems = signal<number>(0);
  protected override totalItems = computed(() => this.serverTotalItems());
  protected override paginatedItems = computed(() => this.items());

  // Sorting State
  protected sortColumn = signal<string | null>(null);
  protected sortOrder = signal<'asc' | 'desc' | null>(null);

  // Filtering State
  protected globalSearch = signal<string>('');
  protected columnFilters = signal<FilterState>({});

  // UI / Async State
  protected isLoading = signal<boolean>(false);
  protected error = signal<string | null>(null);
  
  // Internal trigger used to force manual retries without altering filter states
  private readonly retryTrigger = signal<number>(0);

  /**
   * The fetch method that concrete components MUST implement.
   */
  protected abstract fetchData(request: ServerQueryRequest): Observable<ServerQueryResponse<T>>;

  constructor() {
    super();

    // URL sync removed per request
    // 2. Reactively derive the "API Request body" based on current Signals
    const requestState$ = toObservable(computed(() => ({
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: this.sortColumn(),
      sortOrder: this.sortOrder(),
      globalSearch: this.globalSearch(),
      filters: this.columnFilters(),
      _trigger: this.retryTrigger() // Causes re-emission on retry
    })));

    // 3. Debounce and Execute HTTP Fetch automatically when state changes
    requestState$.pipe(
      debounceTime(300), // Wait 300ms after user stops typing
      tap(() => {
        this.isLoading.set(true);
        this.error.set(null);
      }),
      switchMap((req) => this.fetchData(req as ServerQueryRequest).pipe(
        catchError(err => {
          this.error.set('Failed to initialize data. Please verify your connection and try again.');
          return of(null);
        })
      )),
      takeUntilDestroyed()
    ).subscribe(res => {
      this.isLoading.set(false);

      if (res) {
        this.items.set(res.Data);
        this.serverTotalItems.set(res.Total);
      }
    });

    // Disable local Base Class behaviors to allow RxJS pipeline to drive logic
    this.afterPageChange = () => {};
    this.afterPageSizeChange = () => {};
  }

  ngOnInit() {

    this.onInit();
  }

  protected onInit() {}


  // --- Public Action Handlers --- 

  public onSort(column: string) {
    if (this.sortColumn() === column) {
      if (this.sortOrder() === 'asc') this.sortOrder.set('desc');
      else {
         this.sortColumn.set(null);
         this.sortOrder.set(null);
      }
    } else {
      this.sortColumn.set(column);
      this.sortOrder.set('asc');
    }
    this.currentPage.set(1); // Reset to page 1 on active sort
  }

  public updateSearch(term: string) {
    this.globalSearch.set(term);
    this.currentPage.set(1);
  }

  public updateFilter(column: string, value: any) {
     const newFilters = { ...this.columnFilters() };
     if (value === null || value === '' || value === undefined) {
       delete newFilters[column];
     } else {
       newFilters[column] = value;
     }

     this.columnFilters.set(newFilters);
     this.currentPage.set(1);
  }

  public clearFilters() {
    this.globalSearch.set('');
    this.columnFilters.set({});
    this.sortColumn.set(null);
    this.sortOrder.set(null);
    this.currentPage.set(1);
  }

  public retry() {
    this.retryTrigger.update(v => v + 1);
  }
}
