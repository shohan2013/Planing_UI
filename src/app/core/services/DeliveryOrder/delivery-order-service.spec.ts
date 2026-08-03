import { TestBed } from '@angular/core/testing';

import { DeliveryOrderService } from './delivery-order-service';

describe('DeliveryOrderService', () => {
  let service: DeliveryOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeliveryOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
