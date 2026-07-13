import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';

@Component({
  selector: 'app-base-paginated-table',
  imports: [],
  template: ``,
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export abstract class BasePaginatedTableComponent<T> { 
  
  protected items = signal<T[]>([]);
  protected currentPage = signal(1);
  protected pageSize = signal(10);

  protected totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  protected visiblePages = computed<number[]>(() => {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  });

  protected totalItems = computed(() => {
    return this.filteredItems().length;
  });

  protected startIndex = computed(() => {
    return (this.currentPage() - 1) * this.pageSize();
  });

  protected endIndex = computed(() => {
    return Math.min(this.startIndex() + this.pageSize(), this.totalItems());
  });

  protected filteredItems = computed(() => {
    return this.items();
  });

  protected paginatedItems = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = Math.min(start + this.pageSize(), this.totalItems());
    return this.filteredItems().slice(start, end);
  });

  protected onPageChange(newPage: number) {
    this.currentPage.set(newPage);
    this.afterPageChange();
  }

  protected onPageSizeChange(newSize: number) {
    this.pageSize.set(newSize);
    this.currentPage.set(1);
    this.afterPageSizeChange();
  }
  protected afterPageChange = ()=> {}
  protected afterPageSizeChange = ()=> {}
}
