import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { CommitteeDemoStore } from './committee-demo.store';
import { EvaluatorViewComponent } from './evaluator-view/evaluator-view.component';
import { ScheduleComponent } from './schedule/schedule.component';
import { StudentResultComponent } from './student-result/student-result.component';

type View = 'coordination' | 'evaluator' | 'student';

/** A working mock-up of the evaluation committee, for presenting it before it is built. */
@Component({
  selector: 'app-committee-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScheduleComponent, EvaluatorViewComponent, StudentResultComponent],
  providers: [CommitteeDemoStore],
  templateUrl: './committee-demo.component.html',
})
export class CommitteeDemoComponent {
  protected readonly store = inject(CommitteeDemoStore);

  readonly views: { id: View; label: string }[] = [
    { id: 'coordination', label: 'Coordenação' },
    { id: 'evaluator', label: 'Avaliador' },
    { id: 'student', label: 'Aluno' },
  ];
  readonly view = signal<View>('coordination');
}
