import { TestBed } from '@angular/core/testing';

import { ItemPlanningStateService } from './item-planning-state-service';

describe('ItemPlanningStateService', () => {
  let service: ItemPlanningStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ItemPlanningStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
