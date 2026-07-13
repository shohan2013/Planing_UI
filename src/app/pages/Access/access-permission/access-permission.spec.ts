import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccessPermission } from './access-permission';

describe('AccessPermission', () => {
  let component: AccessPermission;
  let fixture: ComponentFixture<AccessPermission>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AccessPermission]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccessPermission);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
