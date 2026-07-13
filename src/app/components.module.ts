import { NgModule } from '@angular/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from './shared.module';

// Component imports
import { AccordionsComponent } from './DemoPages/Components/accordions/accordions.component';
import { TabsComponent } from './DemoPages/Components/tabs/tabs.component';
import { CarouselComponent } from './DemoPages/Components/carousel/carousel.component';
import { ModalsComponent } from './DemoPages/Components/modals/modals.component';
import { ProgressBarComponent } from './DemoPages/Components/progress-bar/progress-bar.component';
import { TooltipsPopoversComponent } from './DemoPages/Components/tooltips-popovers/tooltips-popovers.component';

@NgModule({
  declarations: [
    AccordionsComponent,
    TabsComponent,
    CarouselComponent,
    ModalsComponent,
    ProgressBarComponent,
    TooltipsPopoversComponent
  ],
  imports: [
    SharedModule,
    NgbModule
  ],
  exports: [
    AccordionsComponent,
    TabsComponent,
    CarouselComponent,
    ModalsComponent,
    ProgressBarComponent,
    TooltipsPopoversComponent
  ]
})
export class ComponentsModule { }