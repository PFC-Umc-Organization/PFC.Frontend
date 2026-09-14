import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Curso } from '../models';
import { MemoriaStore } from './memoria.store';

export abstract class CursoService {
  abstract listar(): Observable<Curso[]>;
}

@Injectable()
export class CursoMockService extends CursoService {
  private readonly store = inject(MemoriaStore);

  override listar(): Observable<Curso[]> {
    return this.store.cursos;
  }
}
