// face-detection.service.ts
import { Injectable } from '@angular/core';
import * as faceapi from 'face-api.js';

@Injectable({ providedIn: 'root' })
export class FaceDetectionService {
  private modelsLoaded = false;

  async initialize(): Promise<void> {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/assets/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/assets/models')
    ]);
    this.modelsLoaded = true;
  }

  async detectExpressions(videoElement: HTMLVideoElement): Promise<faceapi.FaceExpressions | null> {
    if (!this.modelsLoaded) return null;

    const detections = await faceapi
      .detectAllFaces(videoElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    return detections[0]?.expressions || null;
  }
}
