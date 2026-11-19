import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  computed,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Subject, finalize, takeUntil } from 'rxjs';
import {
  IDeliveryOrder,
  IMergeDeliveryOrderRequest,
  IMergePreview,
} from 'src/app/core/model/SalesOrder/sales-order-model';
import { DeliveryOrderService } from 'src/app/core/services/SalesOrder/sales-order-service';

@Component({
  selector: 'app-merge-preview',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './merge-preview.html',
  styleUrl: './merge-preview.scss',
})
export class MergePreview implements OnChanges, OnDestroy {
  /** The exact body that will be sent to MergeDOs on confirm. */
  @Input() request: IMergeDeliveryOrderRequest | null = null;
  @Input() orders: IDeliveryOrder[] = [];
  @Input() policyName: string | null = null;
  @Input() workTypeCode = 'DO';
  @Input() isMerging = false;

  /** Emits the optional remarks entered by the user. */
  @Output() confirm = new EventEmitter<string | null>();
  @Output() closePreview = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  private load$ = new Subject<void>();

  preview = signal<IMergePreview | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  remarks = signal('');

  /** Placeholder rows for the loading skeleton. */
  readonly skeletonRows = [1, 2, 3];

  products = computed(() => this.preview()?.MergedProducts ?? []);
  totalProducts = computed(() => this.products().length);
  totalOriginalLines = computed(() =>
    this.products().reduce(
      (sum, product) => sum + (product.OriginalLines?.length ?? 0),
      0,
    ),
  );

  constructor(private deliveryOrderService: DeliveryOrderService) {}

  get orderLabel(): string {
    return this.workTypeCode === 'REQ' ? 'Requisitions' : 'Delivery Orders';
  }

  get displayPolicyName(): string {
    return this.preview()?.MergePolicyName || this.policyName || '-';
  }

  get canConfirm(): boolean {
    return (
      !this.isLoading() &&
      !this.error() &&
      !this.isMerging &&
      this.totalProducts() > 0
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['request'] && this.request) {
      this.loadPreview();
    }
  }

  loadPreview(): void {
    if (!this.request) {
      return;
    }

    this.load$.next(); // cancel any in-flight preview
    this.isLoading.set(true);
    this.error.set(null);
    this.preview.set(null);

    this.deliveryOrderService
      .PreviewMerge(this.request)
      .pipe(
        takeUntil(this.load$),
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (data) => this.preview.set(data),
        error: () => this.error.set('Could not generate the merge preview.'),
      });
  }

  /** Colour class for a priority badge, picked from the priority name. */
  priorityClass(name: string | null | undefined): string {
    const value = (name ?? '').toLowerCase();
    if (!value) return 'mp-prio-none';
    if (/urgent|critical|emergency|highest/.test(value)) return 'mp-prio-urgent';
    if (/high/.test(value)) return 'mp-prio-high';
    if (/medium|normal|moderate/.test(value)) return 'mp-prio-medium';
    if (/low/.test(value)) return 'mp-prio-low';
    return 'mp-prio-default';
  }

  onRemarksInput(event: Event): void {
    this.remarks.set((event.target as HTMLTextAreaElement).value);
  }

  onConfirm(): void {
    if (!this.canConfirm) {
      return;
    }
    const remarks = this.remarks().trim();
    this.confirm.emit(remarks.length > 0 ? remarks : null);
  }

  close(): void {
    if (!this.isMerging) {
      this.closePreview.emit();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  ngOnDestroy(): void {
    this.load$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
