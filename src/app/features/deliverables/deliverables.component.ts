import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { Observable, catchError, of, switchMap } from 'rxjs';

import { Activity, Project, Submission, TimelineItem } from '../../core/models';
import { ActivityService } from '../../core/services/activity.service';
import { ProjectService } from '../../core/services/project.service';
import { SubmissionService } from '../../core/services/submission.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { TimelineComponent } from '../../shared/components/timeline/timeline.component';
import { SentSubmission, SubmissionListComponent } from './submission-list/submission-list.component';
import { SubmissionFormComponent } from './submission-form/submission-form.component';

/** The student's page to submit and edit the group's deliverables. */
@Component({
  selector: 'app-deliverables',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, TimelineComponent, SubmissionFormComponent, SubmissionListComponent],
  templateUrl: './deliverables.component.html',
})
export class DeliverablesComponent {
  private readonly submissionService = inject(SubmissionService);

  /** Shown instead of misleading empty lists. */
  readonly loadError = signal('');
  readonly downloadError = signal('');

  private orEmpty<T>(empty: T) {
    return (source: Observable<T>) =>
      source.pipe(
        catchError((e: Error) => {
          this.loadError.set(e.message);
          return of(empty);
        }),
      );
  }

  readonly project = toSignal(inject(ProjectService).myProject().pipe(this.orEmpty<Project | null>(null)), {
    initialValue: null as Project | null,
  });

  readonly timeline = toSignal(
    toObservable(this.project).pipe(
      switchMap((p) => (p ? this.submissionService.projectTimeline(p.id, p.nome) : of([]))),
      this.orEmpty([] as TimelineItem[]),
    ),
    { initialValue: [] as TimelineItem[] },
  );

  readonly activities = toSignal(inject(ActivityService).list().pipe(this.orEmpty([] as Activity[])), {
    initialValue: [] as Activity[],
  });

  /** With the answers; refreshes after every submit. */
  readonly submissions = toSignal(
    toObservable(this.project).pipe(
      switchMap((p) => (p ? this.submissionService.ofProject(p.id) : of([] as Submission[]))),
      this.orEmpty([] as Submission[]),
    ),
    { initialValue: [] as Submission[] },
  );

  /** A late activity without a submission is closed; a submitted one stays editable. */
  readonly available = computed(() => this.timeline().filter((item) => item.status !== 'ATRASADO'));

  readonly sent = computed(() =>
    this.submissions()
      .map((submission) => {
        const activity = this.activities().find((a) => a.id === submission.atividadeId);
        return activity ? { activity, submission } : null;
      })
      .filter((s): s is SentSubmission => s !== null)
      .sort((a, b) => a.activity.prazo.localeCompare(b.activity.prazo)),
  );

  readonly selected = signal('');

  constructor() {
    const linked = inject(ActivatedRoute).snapshot.queryParamMap.get('atividade');
    if (linked) {
      // Only on arrival: after sending, the form goes back to empty.
      const apply = effect(() => {
        if (this.available().some((item) => item.activityId === linked)) {
          untracked(() => this.selected.set(linked));
          apply.destroy();
        }
      });
    }
  }

  edit(activityId: string): void {
    this.selected.set(activityId);
    document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth' });
  }

  download({ activityId, fieldId }: { activityId: string; fieldId: string }): void {
    const project = this.project();
    if (!project) {
      return;
    }
    this.downloadError.set('');
    this.submissionService.fileLink(project.id, activityId, fieldId).subscribe({
      next: ({ url }) => window.location.assign(url),
      error: (e: Error) => this.downloadError.set(e.message),
    });
  }
}
