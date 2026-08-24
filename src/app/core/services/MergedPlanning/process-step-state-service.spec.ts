import { TestBed } from '@angular/core/testing';

import { ProcessStepStateService } from './process-step-state-service';

describe('ProcessStepStateService', () => {
  let service: ProcessStepStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProcessStepStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
