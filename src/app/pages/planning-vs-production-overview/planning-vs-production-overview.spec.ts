import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';

import { PlanningVsProductionOverview } from './planning-vs-production-overview';

describe('PlanningVsProductionOverview', () => {
  let component: PlanningVsProductionOverview;
  let fixture: ComponentFixture<PlanningVsProductionOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningVsProductionOverview],
      providers: [provideHttpClient(), provideToastr()],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanningVsProductionOverview);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
