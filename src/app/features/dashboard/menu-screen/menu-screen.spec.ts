import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuScreen } from './menu-screen';

describe('MenuScreen', () => {
  let component: MenuScreen;
  let fixture: ComponentFixture<MenuScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
