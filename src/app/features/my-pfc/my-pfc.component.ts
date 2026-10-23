import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, of, switchMap } from 'rxjs';

import { MyPfc } from '../../core/models';
import { ProjectService } from '../../core/services/project.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CreateProjectComponent } from './create-project/create-project.component';
import { GroupCardComponent } from './group-card/group-card.component';
import { ReceivedInvitationsComponent } from './received-invitations/received-invitations.component';
import { SentInvitationsComponent } from './sent-invitations/sent-invitations.component';

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; mine: MyPfc };

@Component({
  selector: 'app-my-pfc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, GroupCardComponent, SentInvitationsComponent, ReceivedInvitationsComponent, CreateProjectComponent],
  templateUrl: './my-pfc.component.html',
})
export class MyPfcComponent {
  private readonly projectService = inject(ProjectService);
  private readonly reload$ = new BehaviorSubject<void>(undefined);

  /** One call brings the group (with names and advisor) or the student's cohort. */
  private readonly state = toSignal(
    this.reload$.pipe(
      switchMap(() =>
        this.projectService.myPfc().pipe(
          map((mine): State => ({ kind: 'ready', mine })),
          catchError((e: Error) => of<State>({ kind: 'error', message: e.message })),
        ),
      ),
    ),
    { initialValue: { kind: 'loading' } as State },
  );

  readonly group = computed(() => {
    const s = this.state();
    return s.kind === 'ready' ? s.mine.grupo : null;
  });

  readonly loadError = computed(() => {
    const s = this.state();
    return s.kind === 'error' ? s.message : '';
  });

  /** Only who can create gets the form; every other case is a notice. */
  readonly situation = computed<'loading' | 'error' | 'no-cohort' | 'no-program' | 'can-create'>(() => {
    const s = this.state();
    if (s.kind !== 'ready') {
      return s.kind;
    }
    if (!s.mine.turma) {
      return 'no-cohort';
    }
    return s.mine.programaId ? 'can-create' : 'no-program';
  });

  reload(): void {
    this.reload$.next();
  }
}
