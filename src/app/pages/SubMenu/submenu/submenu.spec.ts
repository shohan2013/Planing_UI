import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Submenu } from './submenu';

describe('Submenu', () => {
  let component: Submenu;
  let fixture: ComponentFixture<Submenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Submenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Submenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
