import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PvpCount } from '../pvp-live/pvp-count';

@Component({
  selector: 'app-pvp-progress-bar',
  standalone: true,
  imports: [PvpCount],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pvp-progress" [class.pvp-progress--blue]="variant() === 'planning'">
      <div class="pvp-progress__track">
        <div class="pvp-progress__fill" [style.width.%]="width()"></div>
      </div>
      <span class="pvp-progress__label"><app-pvp-count [value]="value()" [animate]="animate()" format="1.0-0" />%</span>
    </div>
  `,
  styleUrl: './pvp-progress-bar.scss',
})
export class PvpProgressBar {
  readonly value = input<number>(0);
  readonly variant = input<'planning' | 'production'>('planning');
  /** Live update: the % label counts to the new value (the bar always slides via CSS). */
  readonly animate = input(false);

  readonly width = computed(() => Math.min(Math.max(this.value() || 0, 0), 100));
}
