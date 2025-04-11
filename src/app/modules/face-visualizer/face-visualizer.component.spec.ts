import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FaceVisualizerComponent } from './face-visualizer.component';

describe('FaceVisualizerComponent', () => {
  let component: FaceVisualizerComponent;
  let fixture: ComponentFixture<FaceVisualizerComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FaceVisualizerComponent]
    });
    fixture = TestBed.createComponent(FaceVisualizerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
