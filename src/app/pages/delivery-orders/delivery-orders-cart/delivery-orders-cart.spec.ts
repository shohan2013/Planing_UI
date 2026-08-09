import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryOrdersCart } from './delivery-orders-cart';

describe('DeliveryOrdersCart', () => {
  let component: DeliveryOrdersCart;
  let fixture: ComponentFixture<DeliveryOrdersCart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryOrdersCart]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryOrdersCart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
