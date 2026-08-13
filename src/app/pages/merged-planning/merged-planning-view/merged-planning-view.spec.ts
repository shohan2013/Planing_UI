import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MergedPlanningView } from './merged-planning-view';

describe('MergedPlanningView', () => {
  let component: MergedPlanningView;
  let fixture: ComponentFixture<MergedPlanningView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MergedPlanningView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MergedPlanningView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
