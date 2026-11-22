import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, merge, skip, startWith, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Panel } from '../models';
import { toApiError } from './http-error';
import { PenaltyService } from './penalty.service';
import { SubmissionService } from './submission.service';

// Serviço
export abstract class PanelService {
  // Programa
  abstract ofProgram(programId: string): Observable<Panel>;
}

// Serviço
@Injectable()
export class PanelHttpService extends PanelService {
  private readonly http = inject(HttpClient);
  private readonly submissions = inject(SubmissionService);
  private readonly penalties = inject(PenaltyService);

  // Programa
  override ofProgram(programId: string): Observable<Panel> {
    return merge(this.submissions.changes().pipe(skip(1)), this.penalties.changes().pipe(skip(1))).pipe(
      startWith(undefined),
      switchMap(() => this.http.get<Panel>(`${environment.apiBaseUrl}/programas/${programId}/painel`).pipe(catchError(toApiError))),
      map((panel) => ({
        projetos: panel.projetos ?? [],
        atividades: panel.atividades ?? [],
        entregas: panel.entregas ?? [],
        penalidades: panel.penalidades ?? [],
        nomes: { alunos: panel.nomes?.alunos ?? {}, orientadores: panel.nomes?.orientadores ?? {} },
      })),
    );
  }
}
