import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamScreen } from './team-screen';

describe('TeamScreen', () => {
  let component: TeamScreen;
  let fixture: ComponentFixture<TeamScreen>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamScreen]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeamScreen);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
