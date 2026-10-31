import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';

const DURATION_MS = 700;

/**
 * A number that counts from its old value to the new one when `animate` is true (live updates);
 * otherwise it just shows the new value.
 *
 *   <app-pvp-count [value]="row.node.PlannedQty" [animate]="liveFlash()" />
 */
@Component({
  selector: 'app-pvp-count',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `{{ display() | number: format() }}`,
})
export class PvpCount {
  readonly value = input<number | null | undefined>(0);
  readonly animate = input(false);
  /** DecimalPipe digits info, e.g. '1.0-0'; default is the pipe's own. */
  readonly format = input<string | undefined>(undefined);

  readonly display = signal(0);

  private frame = 0;
  private shown: number | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));

    effect(() => {
      const target = this.value() ?? 0;
      untracked(() => {
        cancelAnimationFrame(this.frame);
        const from = this.shown;
        this.shown = target;
        if (from === null || from === target || !this.animate()) {
          this.display.set(target);
          return;
        }
        // Start from what is on screen now (a count still running keeps going smoothly).
        const start = performance.now();
        const origin = this.display();
        const step = (now: number) => {
          const p = Math.min((now - start) / DURATION_MS, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          this.display.set(p < 1 ? origin + (target - origin) * eased : target);
          if (p < 1) this.frame = requestAnimationFrame(step);
        };
        this.frame = requestAnimationFrame(step);
      });
    });
  }
}
