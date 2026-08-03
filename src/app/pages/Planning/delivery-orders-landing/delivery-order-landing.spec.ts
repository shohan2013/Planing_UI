import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryOrderLanding } from './delivery-order-landing';

describe('DeliveryOrderLanding', () => {
  let component: DeliveryOrderLanding;
  let fixture: ComponentFixture<DeliveryOrderLanding>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DeliveryOrderLanding],
    }).compileComponents();

    fixture = TestBed.createComponent(DeliveryOrderLanding);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
