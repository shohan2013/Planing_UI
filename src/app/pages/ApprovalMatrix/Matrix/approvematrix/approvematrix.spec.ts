import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Approvematrix } from './approvematrix';

describe('Approvematrix', () => {
  let component: Approvematrix;
  let fixture: ComponentFixture<Approvematrix>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Approvematrix]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Approvematrix);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
