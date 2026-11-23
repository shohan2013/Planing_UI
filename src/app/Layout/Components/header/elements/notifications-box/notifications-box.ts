import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbDropdown, NgbModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  EMPTY,
  Subject,
  auditTime,
  catchError,
  finalize,
  firstValueFrom,
  interval,
  switchMap,
} from 'rxjs';

import { environment } from 'src/environments/environment';
import { GlobalConstant } from 'src/app/core/constants/global.constants';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { IRequisitionRequestNotification } from 'src/app/core/model/RequisitionApproval/requisition-request-header.model';
import {
  AuthorizationService,
  PermissionAction,
} from 'src/app/core/services/Authorization/authorization.service';
import { RequisitionApprovalService } from 'src/app/core/services/RequisitionApproval/requisition-approval.service';
import { RequisitionNotificationLiveService } from 'src/app/core/services/RequisitionApproval/requisition-notification-live.service';
import { RequisitionRequestsComponent } from 'src/app/pages/RequisitionApproval/RequisitionRequestComponents/requisition-requests.component';

interface DepartingNotification {
  id: number;
  header: IRequisitionRequestNotification;
  left: number;
  top: number;
  width: number;
  height: number;
  offset: number;
}

@Component({
  selector: 'app-notifications-box',
  standalone: true,
  imports: [CommonModule, NgbModule],
  providers: [RequisitionNotificationLiveService],
  templateUrl: './notifications-box.html',
  styleUrls: ['./notifications-box.scss'],
})
export class NotificationsBoxComponent implements OnInit {
  @ViewChild('dropdown') private dropdown?: NgbDropdown;
  @ViewChild('bellButton') private bellButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('viewport') private viewport?: ElementRef<HTMLElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly authorization = inject(AuthorizationService);
  private readonly approvalService = inject(RequisitionApprovalService);
  private readonly live = inject(RequisitionNotificationLiveService);
  private readonly modalService = inject(NgbModal);
  private readonly http = inject(HttpClient);

  private readonly enroll = Number(localStorage.getItem('Enroll'));
  private readonly refreshRequests = new Subject<void>();
  private readonly departureTimers = new Map<number, ReturnType<typeof setTimeout>>();

  private documentStatuses: IDropdownBind[] | null = null;
  private departureId = 0;
  private hasSnapshot = false;
  private openingModal = false;
  private destroyed = false;
  private layoutFrame: number | null = null;
  private resizeObserver?: ResizeObserver;

  readonly notifications = signal<IRequisitionRequestNotification[]>([]);
  readonly departures = signal<DepartingNotification[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly eligible = signal(false);
  readonly firstVisible = signal(0);
  readonly now = signal(Date.now());
  readonly liveStatus = this.live.status;

  readonly unreadCount = computed(() =>
    this.notifications().reduce(
      (total, row) => total + row.UnresolvedRequestCount, 0,
    ),
  );

  readonly visibleCount = computed(() =>
    Math.min(4, this.notifications().length),
  );

  readonly maxFirstVisible = computed(() =>
    Math.max(0, this.notifications().length - 4),
  );

  readonly visibleNotifications = computed(() =>
    this.notifications().slice(
      this.firstVisible(),
      this.firstVisible() + 4,
    ),
  );

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.live.stop();
      this.resizeObserver?.disconnect();

      if (this.layoutFrame !== null)
        cancelAnimationFrame(this.layoutFrame);

      for (const timer of this.departureTimers.values())
        clearTimeout(timer);

      this.departureTimers.clear();
      this.refreshRequests.complete();
    });
  }

  ngOnInit(): void {
    this.refreshRequests.pipe(
      auditTime(100),
      switchMap(() => {
        if (!this.isCurrentUser()) return EMPTY;

        this.loading.set(true);
        this.error.set('');

        return this.approvalService.GetRequestNotifications(this.enroll).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401 || error.status === 403) {
              this.live.stop();
              this.eligible.set(false);
              this.notifications.set([]);
              this.firstVisible.set(0);
            } else {
              this.error.set('Unable to refresh notifications.');
            }

            return EMPTY;
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(rows => {
      if (this.isCurrentUser())
        this.applyNotifications(rows ?? []);
    });

    this.live.changed$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.refresh());

    // One shared timer for every displayed relative timestamp.
    interval(60000).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => this.now.set(Date.now()));

    this.authorization.ensureLoaded().pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        if (!this.isCurrentUser()) return;

        const allowed = this.authorization.hasPermission(
          'requisitionapproval',
          PermissionAction.Update,
        );

        if (allowed)
          this.live.start();
      },
      error: () => this.live.stop(),
    });
  }

  refresh(): void {
    if (this.isCurrentUser())
      this.refreshRequests.next();
  }

  onDropdownChange(open: boolean): void {
    if (!open) return;

    this.now.set(Date.now());
    this.scheduleLayout();
  }

  @HostListener('document:click', ['$event'])
  closeOutsideBell(event: MouseEvent): void {
    if (!this.dropdown?.isOpen()) return;

    const target = event.target;

    if (target instanceof Node &&
        !this.bellButton?.nativeElement.contains(target))
      this.dropdown.close();
  }

  onWheel(event: WheelEvent): void {
    if (!this.maxFirstVisible() || event.deltaY === 0) return;

    event.preventDefault();
    this.setFirstVisible(
      this.firstVisible() + (event.deltaY > 0 ? 1 : -1),
    );
  }

  onListKeydown(event: KeyboardEvent): void {
    const current = this.firstVisible();
    let next: number;

    switch (event.key) {
      case 'ArrowDown': next = current + 1; break;
      case 'ArrowUp': next = current - 1; break;
      case 'PageDown': next = current + 4; break;
      case 'PageUp': next = current - 4; break;
      case 'Home': next = 0; break;
      case 'End': next = this.maxFirstVisible(); break;
      default: return;
    }

    event.preventDefault();
    this.setFirstVisible(next);
  }

  onScrollbarInput(event: Event): void {
    this.setFirstVisible(
      Number((event.target as HTMLInputElement).value),
    );
  }

  relativeTime(value: string | null): string {
    if (!value) return '—';

    const timestamp = Date.parse(value);
    if (!Number.isFinite(timestamp)) return '—';

    const minutes = Math.max(
      0,
      Math.floor((this.now() - timestamp) / 60000),
    );

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;

    return `${Math.floor(minutes / 1440)}d ago`;
  }

  async openRequest(header: IRequisitionRequestNotification): Promise<void> {
    this.dropdown?.close();

    if (this.openingModal || !this.isCurrentUser()) return;

    this.openingModal = true;
    this.error.set('');

    try {
      if (!this.documentStatuses) {
        this.documentStatuses = await firstValueFrom(
          this.http.get<IDropdownBind[]>(
            `${environment.API_URL}${GlobalConstant.API_END_POINTS.DocumentStatus}`,
          ),
        );
      }

      if (this.destroyed || !this.isCurrentUser()) return;

      const modal = this.modalService.open(RequisitionRequestsComponent, {
        fullscreen: true,
        windowClass: 'fullscreen-modal',
        scrollable: true,
        backdrop: 'static',
        keyboard: false,
      });

      modal.componentInstance.header = header;
      modal.componentInstance.documentStatuses = this.documentStatuses;

      try {
        await modal.result;
      } catch {
        // Dismissal is a normal modal outcome.
      }

      if (!this.destroyed)
        this.refresh();
    } catch {
      if (!this.destroyed)
        this.error.set('Unable to open the requisition.');
    } finally {
      this.openingModal = false;
    }
  }

  private isCurrentUser(): boolean {
    return !this.destroyed &&
      Number.isInteger(this.enroll) &&
      this.enroll > 0 &&
      Number(localStorage.getItem('Enroll')) === this.enroll;
  }

  private setFirstVisible(value: number): void {
    this.firstVisible.set(
      Math.max(0, Math.min(value, this.maxFirstVisible())),
    );
    this.scheduleLayout();
  }

  private applyNotifications(rows: IRequisitionRequestNotification[]): void {
    const positions = this.capturePositions();
    const previous = this.notifications();
    const next = [...rows].sort((a, b) => {
      const dateA = Date.parse(a.LatestRequestDate ?? '') || 0;
      const dateB = Date.parse(b.LatestRequestDate ?? '') || 0;

      return dateB - dateA || b.ReqID - a.ReqID;
    });

    if (this.hasSnapshot) {
      const remaining = new Set(next.map(row => row.ReqID));

      for (const header of previous) {
        if (!remaining.has(header.ReqID))
          this.addDeparture(header);
      }
    }

    const previousTop = previous[0];
    const nextTop = next[0];

    const activityMovedToTop = this.hasSnapshot &&
      nextTop &&
      (
        previousTop?.ReqID !== nextTop.ReqID ||
        previousTop?.LatestRequestDate !== nextTop.LatestRequestDate
      );

    this.notifications.set(next);
    this.eligible.set(true);
    this.hasSnapshot = true;

    if (activityMovedToTop)
      this.firstVisible.set(0);
    else
      this.firstVisible.set(
        Math.min(this.firstVisible(), this.maxFirstVisible()),
      );

    this.scheduleLayout(positions);
  }

private addDeparture(header: IRequisitionRequestNotification): void {
  const button = this.bellButton?.nativeElement;
  if (!button) return;

  const bell = button.getBoundingClientRect();
  const topbar = button.closest('.app-header')?.getBoundingClientRect() ?? bell;

  const width = Math.min(210, Math.max(0, bell.left - 16));
  if (!width) return;

  const id = ++this.departureId;

  this.departures.update(items => [
    ...items.map(item => ({ ...item, offset: item.offset + 18 })),
    {
      id,
      header,
      left: bell.left - width - 8,
      top: topbar.top,
      width,
      height: topbar.height,
      offset: 0,
    },
  ]);

  const timer = setTimeout(() => {
    this.departures.update(items => items.filter(item => item.id !== id));
    this.departureTimers.delete(id);
  }, 8000);

  this.departureTimers.set(id, timer);
}
  private capturePositions(): Map<number, number> {
    const positions = new Map<number, number>();

    if (!this.dropdown?.isOpen()) return positions;

    this.viewport?.nativeElement
      .querySelectorAll<HTMLElement>('.request-row')
      .forEach(row => {
        positions.set(Number(row.dataset['reqid']), row.getBoundingClientRect().top);
      });

    return positions;
  }

  private scheduleLayout(previousPositions?: Map<number, number>): void {
    if (this.layoutFrame !== null)
      cancelAnimationFrame(this.layoutFrame);

    this.layoutFrame = requestAnimationFrame(() => {
      this.layoutFrame = null;
      if (this.destroyed || !this.dropdown?.isOpen()) return;

      const viewport = this.viewport?.nativeElement;
      if (!viewport) return;

      if (!this.resizeObserver && typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.fitNames());
        this.resizeObserver.observe(viewport);
      }

      this.fitNames();

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        return;

      viewport.querySelectorAll<HTMLElement>('.request-row').forEach(row => {
        const previous = previousPositions?.get(Number(row.dataset['reqid']));

        if (previous !== undefined) {
          const movement = previous - row.getBoundingClientRect().top;

          if (movement)
            row.animate(
              [
                { transform: `translateY(${movement}px)` },
                { transform: 'translateY(0)' },
              ],
              { duration: 180, easing: 'ease-out' },
            );
        } else if (previousPositions) {
          row.animate(
            [
              { opacity: 0, transform: 'scale(.97)' },
              { opacity: 1, transform: 'scale(1)' },
            ],
            { duration: 180, easing: 'ease-out' },
          );
        }
      });
    });
  }

  private fitNames(): void {
    this.viewport?.nativeElement
      .querySelectorAll<HTMLElement>('.request-creator')
      .forEach(name => {
        name.style.fontSize = '14px';

        if (name.clientWidth > 0 && name.scrollWidth > name.clientWidth) {
          const size = 14 * name.clientWidth / name.scrollWidth;
          name.style.fontSize = `${Math.max(7, size - .2)}px`;
        }
      });
  }
}