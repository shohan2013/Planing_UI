import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryOrderView } from './delivery-order-view';

describe('DeliveryOrderView', () => {
  let component: DeliveryOrderView;
  let fixture: ComponentFixture<DeliveryOrderView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeliveryOrderView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeliveryOrderView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
