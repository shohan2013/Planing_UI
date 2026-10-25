import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Bom } from './bom';

describe('Bom', () => {
  let component: Bom;
  let fixture: ComponentFixture<Bom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Bom]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Bom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
