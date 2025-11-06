import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordSuccess } from './password-success';

describe('PasswordSuccess', () => {
  let component: PasswordSuccess;
  let fixture: ComponentFixture<PasswordSuccess>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordSuccess]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PasswordSuccess);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
