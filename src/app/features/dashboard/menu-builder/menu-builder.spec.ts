import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuBuilder } from './menu-builder';

describe('MenuBuilder', () => {
  let component: MenuBuilder;
  let fixture: ComponentFixture<MenuBuilder>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuBuilder]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuBuilder);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
