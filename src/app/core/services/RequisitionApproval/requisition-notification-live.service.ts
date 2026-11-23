import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { Subject, firstValueFrom, timeout } from 'rxjs';

import { environment } from 'src/environments/environment';
import { GlobalConstant } from '../../constants/global.constants';
import { RequisitionApprovalService } from './requisition-approval.service';

export type RequisitionNotificationLiveStatus =
  | 'offline'
  | 'checking'
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'denied'
  | 'unauthorized';

const CHANGED_EVENT = 'RequisitionRequestsChanged';
const RETRY_DELAYS = [0, 2000, 5000, 10000, 30000];

@Injectable()
export class RequisitionNotificationLiveService implements OnDestroy {
  private readonly approvalService = inject(RequisitionApprovalService);

  readonly status = signal<RequisitionNotificationLiveStatus>('offline');

  private readonly changes = new Subject<void>();
  readonly changed$ = this.changes.asObservable();

  private connection: HubConnection | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private generation = 0;
  private enroll = 0;
  private stopped = true;
  private connecting = false;

  start(): void {
    if (!this.stopped) return;

    const enroll = Number(localStorage.getItem('Enroll'));

    if (!Number.isInteger(enroll) || enroll <= 0) {
      this.status.set('unauthorized');
      return;
    }

    this.enroll = enroll;
    this.stopped = false;
    this.attempt = 0;
    const generation = ++this.generation;

    const url = new URL(
      GlobalConstant.HUBS.RequisitionNotifications, `${new URL(environment.API_URL).origin}/`, );url.searchParams.set('enroll', String(enroll));

    const connection = new HubConnectionBuilder()
      .withUrl(url.toString(), { withCredentials: true })
      .withAutomaticReconnect(RETRY_DELAYS)
      .configureLogging(environment.production ? LogLevel.None : LogLevel.Warning,)
      .build();

    this.connection = connection;

    connection.on(CHANGED_EVENT, () => {
      if (this.isCurrent(generation)) {
        this.debug('refresh event received');
        this.changes.next();
      }
    });

    connection.onreconnecting(() => {
      if (!this.isCurrent(generation)) return;

      this.status.set('reconnecting');

      // Stop library retries if current eligibility has been revoked.
      void this.checkDuringReconnect(generation);
    });

    connection.onreconnected(() => {
      if (!this.isCurrent(generation)) return;

      this.attempt = 0;
      this.status.set('live');
      this.debug('reconnected');
      this.changes.next();
    });

    connection.onclose(() => {
      if (!this.isCurrent(generation)) return;

      this.status.set('offline');

      // Initial start failures are handled by connect() itself.
      if (!this.connecting)
        this.scheduleConnect(generation);
    });

    void this.connect(generation);
  }

  stop(): void {
    this.stopped = true;
    this.generation++;
    this.connecting = false;
    this.attempt = 0;

    if (this.retryTimer !== null)
      clearTimeout(this.retryTimer);

    this.retryTimer = null;

    const connection = this.connection;
    this.connection = null;
    this.status.set('offline');

    void connection?.stop().catch(() => undefined);
  }

  ngOnDestroy(): void {
    this.stop();
    this.changes.complete();
  }

  private isCurrent(generation: number): boolean {
    if (this.stopped || this.generation !== generation)
      return false;

    if (Number(localStorage.getItem('Enroll')) !== this.enroll) {
      this.stop();
      return false;
    }

    return true;
  }

  private async checkEligibility(generation: number): Promise<boolean> {
    const result = await firstValueFrom(
      this.approvalService.GetNotificationEligibility().pipe(
        timeout(15000),
      ),
    );

    if (!this.isCurrent(generation))
      return false;

    if (!result.CanConnect) {
      this.stop();
      this.status.set('denied');
      return false;
    }

    return true;
  }

  private async connect(generation: number): Promise<void> {
    const connection = this.connection;

    if (!this.isCurrent(generation) ||
        !connection ||
        this.connecting ||
        connection.state !== HubConnectionState.Disconnected)
      return;

    this.connecting = true;

    try {
      this.status.set('checking');

      if (!await this.checkEligibility(generation))
        return;

      this.status.set(this.attempt ? 'reconnecting' : 'connecting');

      await connection.start();

      if (!this.isCurrent(generation))
        return;

      this.attempt = 0;
      this.status.set('live');
      this.debug('connected');

      // Fetch current notifications on initial connection and recovery.
      this.changes.next();
    } catch (error: unknown) {
      if (!this.isCurrent(generation))
        return;

      if (this.stopForAccessFailure(error))
        return;

      this.debug('connection attempt failed', error);
      this.status.set('offline');
      this.scheduleConnect(generation);
    } finally {
      if (this.generation === generation)
        this.connecting = false;
    }
  }

  private async checkDuringReconnect(generation: number): Promise<void> {
    try {
      await this.checkEligibility(generation);
    } catch (error: unknown) {
      if (!this.isCurrent(generation))
        return;

      // A network failure does not prove access was revoked.
      this.stopForAccessFailure(error);
    }
  }

  private stopForAccessFailure(error: unknown): boolean {
    const status = error instanceof HttpErrorResponse
      ? error.status
      : (error as { statusCode?: number } | null)?.statusCode;

    if (status !== 400 && status !== 401 && status !== 403)
      return false;

    this.stop();
    this.status.set(status === 401 ? 'unauthorized' : 'denied');
    return true;
  }

  private scheduleConnect(generation: number): void {
    if (!this.isCurrent(generation) || this.retryTimer !== null)
      return;

    const delay = RETRY_DELAYS[
      Math.min(this.attempt, RETRY_DELAYS.length - 1)
    ];

    this.attempt++;

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;

      if (this.isCurrent(generation))
        void this.connect(generation);
    }, delay);
  }

  private debug(message: string, error?: unknown): void {
    if (!environment.production)
      console.info(`[Requisition notifications] ${message}`, error ?? '');
  }
}