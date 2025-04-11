import { TestBed } from '@angular/core/testing';

import { ExpressionMapperService } from './expression-mapper.service';

describe('ExpressionMapperService', () => {
  let service: ExpressionMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExpressionMapperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
