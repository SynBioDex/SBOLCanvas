import { HttpClientModule } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material';

import { GraphService } from './graph.service';

describe('GraphService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [MatDialogModule, HttpClientModule]
  }));

  it('should be created', () => {
    const service: GraphService = TestBed.get(GraphService);
    expect(service).toBeTruthy();
  });
});
