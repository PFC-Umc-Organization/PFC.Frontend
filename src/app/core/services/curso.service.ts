import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Curso } from '../models';
import { MemoriaStore } from './memoria.store';

/** Contrato consumido pelos componentes. Trocar a implementação = trocar o provider. */
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
