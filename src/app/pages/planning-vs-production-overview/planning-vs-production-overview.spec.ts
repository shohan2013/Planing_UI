import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideToastr } from 'ngx-toastr';
import { EMPTY } from 'rxjs';

import {
  PlanningVsProductionLiveService,
  PvpLiveStatus,
} from 'src/app/core/services/PlanningVsProduction/planning-vs-production-live.service';
import { PlanningVsProductionOverview } from './planning-vs-production-overview';

/** Stands in for the SignalR connection so the test never dials the hub. */
const liveStub: Partial<PlanningVsProductionLiveService> = {
  status: signal<PvpLiveStatus>('offline'),
  changed$: EMPTY,
  start: () => undefined,
  stop: () => undefined,
};

describe('PlanningVsProductionOverview', () => {
  let component: PlanningVsProductionOverview;
  let fixture: ComponentFixture<PlanningVsProductionOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanningVsProductionOverview],
      providers: [provideHttpClient(), provideToastr()],
    })
      .overrideComponent(PlanningVsProductionOverview, {
        set: { providers: [{ provide: PlanningVsProductionLiveService, useValue: liveStub }] },
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
