import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileScreen } from './profile-screen';

describe('ProfileScreen', () => {
  let component: ProfileScreen;
  let fixture: ComponentFixture<ProfileScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
