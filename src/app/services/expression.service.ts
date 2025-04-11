// expression.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExpressionService {
  private expressionPresets = {
    happy: {
      morphTargets: {
        mouthSmile: 1,
        eyeSquintLeft: 0.8,
        eyeSquintRight: 0.8
      },
      animation: 'smile_animation'
    },
    sad: {
      morphTargets: {
        mouthFrown: 1,
        browInnerUp: 0.7,
        eyeClosedLeft: 0.3,
        eyeClosedRight: 0.3
      },
      animation: 'sad_animation'
    }
  };

  getExpressionConfig(expression: string) {
    return this.expressionPresets[expression.toLowerCase()] ||
           this.expressionPresets['neutral'];
  }
}
