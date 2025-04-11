// expression-mapper.service.ts
import { Injectable } from '@angular/core';
import { FaceExpression } from '../models/face-expression.enum';
import { FaceExpressions } from 'face-api.js';

@Injectable({ providedIn: 'root' })
export class ExpressionMapperService {
  private expressionMap = {
    [FaceExpression.HAPPY]: {
      scale: [1.2, 1.2, 1.2],
      color: 0xffff00,
      animation: 'bounce'
    },
    [FaceExpression.SAD]: {
      scale: [0.9, 0.9, 0.9],
      color: 0x0000ff,
      animation: 'sink'
    },
    [FaceExpression.SURPRISED]: {
      scale: [1.1, 1.3, 1.1],
      color: 0xff0000,
      animation: 'pop'
    },
    [FaceExpression.ANGRY]: {
      scale: [1.1, 0.9, 1.1],
      color: 0xff3300,
      animation: 'shake'
    },
    [FaceExpression.NEUTRAL]: {
      scale: [1, 1, 1],
      color: 0xffaa00,
      animation: 'none'
    }
  };

  getExpressionConfig(expression: FaceExpression) {
    return this.expressionMap[expression] || this.expressionMap[FaceExpression.NEUTRAL];
  }

  getDominantExpression(expressions: FaceExpressions): FaceExpression {
    const expressionValues = {
      [FaceExpression.HAPPY]: expressions.happy,
      [FaceExpression.SAD]: expressions.sad,
      [FaceExpression.ANGRY]: expressions.angry,
      [FaceExpression.SURPRISED]: expressions.surprised,
      [FaceExpression.NEUTRAL]: expressions.neutral
    };

    let maxProbability = 0;
    let dominantExpression = FaceExpression.NEUTRAL;

    (Object.keys(expressionValues) as FaceExpression[]).forEach(expression => {
      if (expressionValues[expression] > maxProbability) {
        maxProbability = expressionValues[expression];
        dominantExpression = expression;
      }
    });

    return dominantExpression;
  }
}
