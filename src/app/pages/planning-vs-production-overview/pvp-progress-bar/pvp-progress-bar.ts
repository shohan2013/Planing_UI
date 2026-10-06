import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-pvp-progress-bar',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pvp-progress" [class.pvp-progress--blue]="variant() === 'production'">
      <div class="pvp-progress__track">
        <div class="pvp-progress__fill" [style.width.%]="width()"></div>
      </div>
      <span class="pvp-progress__label">{{ value() | number: '1.0-0' }}%</span>
    </div>
  `,
  styleUrl: './pvp-progress-bar.scss',
})
export class PvpProgressBar {
  readonly value = input<number>(0);
  readonly variant = input<'planning' | 'production'>('planning');

  readonly width = computed(() => Math.min(Math.max(this.value() || 0, 0), 100));
}
