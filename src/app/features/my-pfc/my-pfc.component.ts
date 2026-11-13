import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { MyPfc } from '../../core/models';
import { ProjectService } from '../../core/services/project.service';
import { loadable } from '../../core/state/loadable';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CreateProjectComponent } from './create-project/create-project.component';
import { GroupCardComponent } from './group-card/group-card.component';
import { ReceivedInvitationsComponent } from './received-invitations/received-invitations.component';
import { SentInvitationsComponent } from './sent-invitations/sent-invitations.component';

@Component({
  selector: 'app-my-pfc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, GroupCardComponent, SentInvitationsComponent, ReceivedInvitationsComponent, CreateProjectComponent],
  templateUrl: './my-pfc.component.html',
})
export class MyPfcComponent {
  private readonly projectService = inject(ProjectService);
  /** One call brings the group (with names and advisor) or the student's cohort. Null until it arrives. */
  private readonly mine = loadable({ source: () => this.projectService.myPfc(), initial: null as MyPfc | null });

  readonly group = computed(() => this.mine.value()?.grupo ?? null);

  readonly loadError = this.mine.error;

  /** Only who can create gets the form; every other case is a notice. A reload keeps the last answer on screen. */
  readonly situation = computed<'loading' | 'error' | 'no-cohort' | 'no-program' | 'can-create'>(() => {
    if (this.mine.error()) {
      return 'error';
    }
    const mine = this.mine.value();
    if (!mine) {
      return 'loading';
    }
    if (!mine.turma) {
      return 'no-cohort';
    }
    return mine.programaId ? 'can-create' : 'no-program';
  });

  reload(): void {
    this.mine.reload();
  }
}
