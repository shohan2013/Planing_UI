import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionSteps } from './production-steps';

describe('ProductionSteps', () => {
  let component: ProductionSteps;
  let fixture: ComponentFixture<ProductionSteps>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionSteps]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductionSteps);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
