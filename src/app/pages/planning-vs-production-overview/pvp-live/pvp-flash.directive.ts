import { Directive, Injector, afterNextRender, effect, inject, input, signal, untracked } from '@angular/core';

/**
 * Flashes its host green when the bound number goes up and red when it goes down, but only
 * while `pvpFlashLive` is true (a live update), never on the first value or a normal reload.
 *
 *   <td [pvpFlash]="row.node.PlannedQty" [pvpFlashLive]="liveFlash()">...</td>
 */
@Directive({
  selector: '[pvpFlash]',
  standalone: true,
  host: {
    class: 'pvp-flash',
    '[class.pvp-flash--up]': "direction() === 'up'",
    '[class.pvp-flash--down]': "direction() === 'down'",
    '(animationend)': 'onAnimationEnd($event)',
  },
})
export class PvpFlash {
  readonly pvpFlash = input<number | null | undefined>(null);
  readonly pvpFlashLive = input(false);

  readonly direction = signal<'up' | 'down' | null>(null);

  private readonly injector = inject(Injector);
  private previous: number | null | undefined = undefined;

  constructor() {
    effect(() => {
      const value = this.pvpFlash();
      untracked(() => {
        const previous = this.previous;
        this.previous = value;
        if (previous == null || value == null || previous === value || !this.pvpFlashLive()) return;

        const next = value > previous ? 'up' : 'down';
        // Already flashing: drop the class for one frame so the animation starts again.
        if (this.direction()) {
          this.direction.set(null);
          afterNextRender(() => this.direction.set(next), { injector: this.injector });
        } else {
          this.direction.set(next);
        }
      });
    });
  }

  onAnimationEnd(event: AnimationEvent): void {
    if (event.animationName.startsWith('pvp-flash')) this.direction.set(null);
  }
}
