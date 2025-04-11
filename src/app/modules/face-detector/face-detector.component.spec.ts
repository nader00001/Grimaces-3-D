import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaceDetectorComponent } from './face-detector.component';

describe('FaceDetectorComponent', () => {
  let component: FaceDetectorComponent;
  let fixture: ComponentFixture<FaceDetectorComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FaceDetectorComponent]
    });
    fixture = TestBed.createComponent(FaceDetectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
