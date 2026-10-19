import { Component, OnDestroy, input, signal } from '@angular/core';

type FGTab = 'bom' | 'routing' | 'operation' | 'workcenter' | 'machine';

@Component({
  selector: 'app-fg-expanded',
  standalone: true,
  templateUrl: './fg-expanded.component.html',
  styleUrl: './fg-expanded.component.scss',
})
export class FGExpandedComponent implements OnDestroy {
  readonly itemId = input.required<number>();
  readonly itemName = input.required<string>();
  readonly unitId = input.required<number>();
  readonly businessId = input.required<number>();

  readonly activeTab = signal<FGTab>('bom');
  private tabTimer: ReturnType<typeof setTimeout> | null = null;

  
  selectTab(tab: FGTab): void {
    if (this.tabTimer !== null) clearTimeout(this.tabTimer);
    if (tab === this.activeTab()) return;

    this.tabTimer = setTimeout(() => {
      this.activeTab.set(tab);
      this.tabTimer = null;
    }, 300);
  }


  ngOnDestroy(): void {
    if (this.tabTimer !== null) clearTimeout(this.tabTimer);
  }
}

