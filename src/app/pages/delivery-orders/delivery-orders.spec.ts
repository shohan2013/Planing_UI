import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryOrders } from './delivery-orders';

describe('DeliveryOrders', () => {
  let component: DeliveryOrders;
  let fixture: ComponentFixture<DeliveryOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeliveryOrders]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
