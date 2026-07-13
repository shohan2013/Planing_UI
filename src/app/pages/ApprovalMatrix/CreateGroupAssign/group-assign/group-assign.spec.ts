import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupAssign } from './group-assign';

describe('GroupAssign', () => {
  let component: GroupAssign;
  let fixture: ComponentFixture<GroupAssign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GroupAssign]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupAssign);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
