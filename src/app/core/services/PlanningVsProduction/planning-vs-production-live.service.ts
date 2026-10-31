import { Injectable, OnDestroy, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalConstant } from '../../constants/global.constants';

export type PvpLiveStatus = 'connecting' | 'live' | 'reconnecting' | 'offline';

/** Event the backend sends whenever planning, order or production data behind the overview changes. */
const CHANGED_EVENT = 'PvPOverviewChanged';

/** Waits between reconnect attempts (ms); the last one repeats until the hub is back. */
const RETRY_DELAYS = [0, 2000, 5000, 10000, 30000];

/** Dev builds only: traces the live connection in the browser console ([PvP live] ...). */
function debugLog(message: string, ...details: unknown[]): void {
  if (!environment.production) console.info(`[PvP live] ${message}`, ...details);
}

/** Transport SignalR settled on (WebSockets / ServerSentEvents / LongPolling), for the debug log. */
function transportName(connection: HubConnection): string {
  const transport = (connection as unknown as { connection?: { transport?: object } }).connection?.transport;
  return transport?.constructor?.name ?? 'unknown';
}

/** Hub URL on the API host: https://host:port/hubs/... (API_URL ends in /api/). */
function hubUrl(): string {
  return `${new URL(environment.API_URL).origin}/${GlobalConstant.HUBS.PlanningVsProductionOverviewLive}`;
}

/**
 * SignalR connection to the Planning vs Production overview hub. Provided by the overview page
 * (not root), so the connection lives only while the page is open.
 *
 * The hub broadcasts `PvPOverviewChanged` with no data we rely on; `changed$` just says
 * "something changed, re-fetch". It also fires after a reconnect, since events may have been
 * missed while the connection was down.
 */
@Injectable()
export class PlanningVsProductionLiveService implements OnDestroy {
  readonly status = signal<PvpLiveStatus>('offline');

  private readonly changes = new Subject<void>();
  readonly changed$: Observable<void> = this.changes.asObservable();

  private connection: HubConnection | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private attempt = 0;
  private stopped = true;

  start(): void {
    if (this.connection) return;
    this.stopped = false;

    // Same identification as authintercepthor: cookies + X-Enroll. Browsers can't put custom
    // headers on a WebSocket, so X-Enroll reaches the negotiate request (and SSE / long polling) only.
    const enroll = localStorage.getItem('Enroll');
    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl(), {
        withCredentials: true,
        headers: enroll ? { 'X-Enroll': enroll } : {},
      })
      .withAutomaticReconnect(RETRY_DELAYS)
      .configureLogging(environment.production ? LogLevel.None : LogLevel.Warning)
      .build();

    this.connection.on(CHANGED_EVENT, (...args: unknown[]) => {
      debugLog(`${CHANGED_EVENT} received`, ...args);
      this.changes.next();
    });
    this.connection.onreconnecting((err) => {
      debugLog('connection lost, reconnecting', err);
      this.status.set('reconnecting');
    });
    this.connection.onreconnected(() => {
      debugLog('reconnected');
      this.status.set('live');
      this.changes.next();
    });
    // Automatic reconnect gave up (or the server closed): keep retrying on our own schedule.
    this.connection.onclose((err) => {
      if (this.stopped) return;
      debugLog('connection closed', err);
      this.status.set('offline');
      this.scheduleConnect();
    });

    this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const connection = this.connection;
    this.connection = null;
    this.status.set('offline');
    connection?.stop().catch(() => undefined);
  }

  ngOnDestroy(): void {
    this.stop();
    this.changes.complete();
  }

  private connect(): void {
    const connection = this.connection;
    if (!connection || this.stopped) return;
    this.status.set(this.attempt ? 'reconnecting' : 'connecting');
    connection
      .start()
      .then(() => {
        debugLog(`connected to ${hubUrl()} (transport: ${transportName(connection)})`);
        const recovered = this.attempt > 0;
        this.attempt = 0;
        this.status.set('live');
        if (recovered) this.changes.next();
      })
      .catch((err: unknown) => {
        debugLog(`could not connect to ${hubUrl()}`, err);
        if (this.stopped) return;
        this.status.set('offline');
        this.scheduleConnect();
      });
  }

  private scheduleConnect(): void {
    const delay = RETRY_DELAYS[Math.min(this.attempt, RETRY_DELAYS.length - 1)];
    this.attempt++;
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }
}
