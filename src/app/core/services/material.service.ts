import { Injectable, inject } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';

import { Material, NovoMaterial } from '../models';
import { MemoriaStore } from './memoria.store';

export abstract class MaterialService {
  abstract listar(cursoId?: string | null): Observable<Material[]>;
  abstract criar(novo: NovoMaterial): Observable<Material>;
  abstract remover(materialId: string): Observable<void>;
}

@Injectable()
export class MaterialMockService extends MaterialService {
  private readonly store = inject(MemoriaStore);

  override listar(cursoId?: string | null): Observable<Material[]> {
    return this.store.materiais.pipe(
      map((materiais) =>
        materiais
          .filter(
            (m) => m.cursoId === null || !cursoId || m.cursoId === cursoId,
          )
          .slice()
          .sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm)),
      ),
    );
  }

  override criar(novo: NovoMaterial): Observable<Material> {
    const material: Material = {
      id: `m-${crypto.randomUUID()}`,
      titulo: novo.titulo.trim(),
      descricao: novo.descricao.trim(),
      tipo: novo.tipo,
      url: novo.url.trim(),
      cursoId: novo.cursoId,
      publicadoEm: new Date().toISOString(),
    };

    this.store.adicionarMaterial(material);
    return of(material).pipe(delay(300));
  }

  override remover(materialId: string): Observable<void> {
    this.store.removerMaterial(materialId);
    return of(undefined).pipe(delay(200));
  }
}
