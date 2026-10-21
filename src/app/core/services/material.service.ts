import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, map, of } from 'rxjs';

import { Material, NovoMaterial } from '../models';

export abstract class MaterialService {
  /** `false` enquanto os materiais não são salvos no servidor. */
  abstract readonly persistente: boolean;
  abstract listar(cursoId?: string | null): Observable<Material[]>;
  abstract criar(novo: NovoMaterial): Observable<Material>;
  abstract remover(materialId: string): Observable<void>;
}

/**
 * Guarda os materiais só na memória do navegador: o backend ainda não tem esse
 * domínio. A tela avisa que eles somem ao recarregar e que o aluno não os vê.
 */
@Injectable()
export class MaterialLocalService extends MaterialService {
  override readonly persistente = false;
  private readonly materiais = signal<Material[]>([]);
  private readonly materiais$ = toObservable(this.materiais);

  override listar(cursoId?: string | null): Observable<Material[]> {
    return this.materiais$.pipe(
      map((materiais) =>
        materiais
          .filter((m) => m.cursoId === null || !cursoId || m.cursoId === cursoId)
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
    this.materiais.update((lista) => [...lista, material]);
    return of(material);
  }

  override remover(materialId: string): Observable<void> {
    this.materiais.update((lista) => lista.filter((m) => m.id !== materialId));
    return of(undefined);
  }
}
