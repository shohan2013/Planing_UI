import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MergedPlanning } from './merged-planning';

describe('MergedPlanning', () => {
  let component: MergedPlanning;
  let fixture: ComponentFixture<MergedPlanning>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MergedPlanning]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MergedPlanning);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
