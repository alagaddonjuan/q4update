import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UssdScreen } from './ussd-screen';

describe('UssdScreen', () => {
  let component: UssdScreen;
  let fixture: ComponentFixture<UssdScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UssdScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UssdScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
