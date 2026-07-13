import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
// import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Ellipsis, LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule, FormsModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  totalItems = input<number>(0);
  pageSizes = input<number[]>([10, 20, 50, 100]);

  pageChanged = output<number>();
  pageSizeChanged = output<number>();


  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  startIndex = computed(() => {
    return (this.currentPage() - 1) * this.pageSize();
  });

  endIndex = computed(() => {
    return Math.min(this.startIndex() + this.pageSize(), this.totalItems());
  });

  currentPage = model<number>(1);
  pageSize = model<number>(10);


  // icons = {
  //   ChevronRight: ChevronRight,
  //   ChevronLeft: ChevronLeft,
  //   ChevronLast: ChevronLast,
  //   ChevronFirst: ChevronFirst,
  //   Ellipsis: Ellipsis
  // }

  visiblePages = computed<number[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const maxVisible = 10;

    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    let start = Math.max(1, current - Math.floor(maxVisible / 2) - 1);
    let end = start + maxVisible - 1;

    if (end > total) {
      end = total;
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages: number[] = [];

    // Always show first page
    if (start > 1) pages.push(1);

    // Add ... if there's a gap after first page
    if (start > 2) pages.push(-1); // -1 represents ellipsis

    // Add middle pages
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ... if there's a gap before last page
    if (end < total - 1) pages.push(-2); // -2 represents ellipsis

    // Always show last page
    if (end < total) pages.push(total);

    return pages;
  });

  onPrevPage(): void {
    if (this.currentPage() > 1) {
      const newPage = this.currentPage() - 1;
      this.currentPage.set(newPage);
      this.pageChanged.emit(newPage);
    }
  }

  onNextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      const newPage = this.currentPage() + 1;
      this.currentPage.set(newPage);
      this.pageChanged.emit(newPage);
    }
  }

  onFirstPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(1);
      this.pageChanged.emit(1);
    }
  }

  onLastPage(): void {
    if (this.currentPage() < this.totalPages()) {
      const newPage = this.totalPages();
      this.currentPage.set(newPage);
      this.pageChanged.emit(newPage);
    }
  }
  
  onGoToPage(page: number): void {
    if (page !== this.currentPage()) {
      this.currentPage.set(page);
      this.pageChanged.emit(page);
    }
  }
}
