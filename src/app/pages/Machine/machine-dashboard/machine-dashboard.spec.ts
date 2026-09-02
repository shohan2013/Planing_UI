import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineDashboard } from './machine-dashboard';

describe('MachineDashboard', () => {
  let component: MachineDashboard;
  let fixture: ComponentFixture<MachineDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MachineDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MachineDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
