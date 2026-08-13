import { TestBed } from '@angular/core/testing';

import { MergedPlanningServices } from './merged-planning-services';

describe('MergedPlanningServices', () => {
  let service: MergedPlanningServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MergedPlanningServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
