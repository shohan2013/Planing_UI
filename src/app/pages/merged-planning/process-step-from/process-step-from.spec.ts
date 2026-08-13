import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessStepFrom } from './process-step-from';

describe('ProcessStepFrom', () => {
  let component: ProcessStepFrom;
  let fixture: ComponentFixture<ProcessStepFrom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessStepFrom]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessStepFrom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
