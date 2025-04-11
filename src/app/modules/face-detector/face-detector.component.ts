// face-detector.component.ts
import { Component, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FaceDetectionService } from '../../services/face-detection.service';
import { ExpressionMapperService } from '../../services/expression-mapper.service';
import { FaceExpression } from '../../models/face-expression.enum';
import { FaceExpressions } from 'face-api.js';

@Component({
  selector: 'app-face-detector',
  templateUrl: './face-detector.component.html',
  styleUrls: ['./face-detector.component.scss']
})
export class FaceDetectorComponent implements OnDestroy {
  @Output() expressionChanged = new EventEmitter<FaceExpression>();

  private detectionInterval: any;
  private videoStream!: MediaStream;

  constructor(
    private faceDetection: FaceDetectionService,
    private expressionMapper: ExpressionMapperService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.faceDetection.initialize();
    await this.startVideoCapture();
    this.startExpressionDetection();
  }

  private async startVideoCapture(): Promise<void> {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      const videoElement = document.createElement('video');
      videoElement.srcObject = this.videoStream;
      videoElement.width = 640;
      videoElement.height = 480;
      videoElement.autoplay = true;
      videoElement.muted = true;
      videoElement.playsInline = true;
      document.body.appendChild(videoElement);
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  }

  private startExpressionDetection(): void {
    this.detectionInterval = setInterval(async () => {
      const videoElements = document.getElementsByTagName('video');
      if (videoElements.length === 0) return;

      const expressions = await this.faceDetection.detectExpressions(videoElements[0]);
      if (expressions) {
        const dominantExpression = this.expressionMapper.getDominantExpression(expressions);
        this.expressionChanged.emit(dominantExpression);
      }
    }, 300);
  }

  ngOnDestroy(): void {
    clearInterval(this.detectionInterval);
    this.videoStream?.getTracks().forEach(track => track.stop());
    const videoElements = document.getElementsByTagName('video');
    if (videoElements.length > 0) {
      document.body.removeChild(videoElements[0]);
    }
  }
}
