import 'face-api.js';

declare module 'face-api.js' {
  interface FaceExpressions {
    happy: number;
    sad: number;
    angry: number;
    surprised: number;
    disgusted: number;
    fearful: number;
    neutral: number;
  }
}
