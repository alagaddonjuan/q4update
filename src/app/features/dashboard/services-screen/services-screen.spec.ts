import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServicesScreen } from './services-screen';

describe('ServicesScreen', () => {
  let component: ServicesScreen;
  let fixture: ComponentFixture<ServicesScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicesScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServicesScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
