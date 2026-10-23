import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';

import { Project, Reference, isStaff } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ReferenceService } from '../../core/services/reference.service';
import { DoiLookupComponent } from './doi-lookup/doi-lookup.component';
import { ReferenceListComponent } from './reference-list/reference-list.component';
import { TopicSearchComponent } from './topic-search/topic-search.component';

type Mode = 'topic' | 'doi';

/**
 * A student searches articles (by topic on OpenAlex or by DOI on Crossref,
 * both through the backend) and builds the group's list, already in ABNT.
 * The staff picks a PFC and follows its list without editing.
 */
@Component({
  selector: 'app-references',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TopicSearchComponent, DoiLookupComponent, ReferenceListComponent, RouterLink],
  templateUrl: './references.component.html',
  styleUrl: './references.component.scss',
})
export class ReferencesComponent {
  private readonly auth = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly referenceService = inject(ReferenceService);

  readonly staff = computed(() => isStaff(this.auth.role()));

  private readonly studentProject = toSignal(
    toObservable(this.staff).pipe(
      switchMap((staff) => (staff ? of(null) : this.projectService.myProject().pipe(catchError(() => of(null))))),
    ),
    { initialValue: null as Project | null },
  );

  /** For the staff's picker; the backend returns an advisor only their projects. */
  readonly projects = toSignal(
    toObservable(this.staff).pipe(
      switchMap((staff) => (staff ? this.projectService.list().pipe(catchError(() => of([] as Project[]))) : of([] as Project[]))),
    ),
    { initialValue: [] as Project[] },
  );
  private readonly chosen = signal('');

  readonly project = computed<Project | null>(() => {
    if (!this.staff()) {
      return this.studentProject();
    }
    const list = this.projects();
    return list.find((p) => p.id === this.chosen()) ?? list[0] ?? null;
  });

  private readonly version = signal(0);
  readonly loading = signal(false);
  readonly loadError = signal('');

  readonly references = toSignal(
    toObservable(computed(() => ({ id: this.project()?.id ?? '', version: this.version() }))).pipe(
      tap(() => this.loadError.set('')),
      switchMap(({ id }) => {
        if (!id) {
          return of([] as Reference[]);
        }
        this.loading.set(true);
        return this.referenceService.ofProject(id).pipe(
          tap(() => this.loading.set(false)),
          catchError((e: Error) => {
            this.loading.set(false);
            this.loadError.set(e.message);
            return of([] as Reference[]);
          }),
        );
      }),
    ),
    { initialValue: [] as Reference[] },
  );

  readonly dois = computed(() => new Set(this.references().map((r) => r.doi.toLowerCase())));

  readonly mode = signal<Mode>('topic');
  readonly message = signal('');

  constructor() {
    // Switching tabs clears the previous action's message.
    effect(() => {
      this.mode();
      this.message.set('');
    });
  }

  choose(event: Event): void {
    this.chosen.set((event.target as HTMLSelectElement).value);
  }

  added(): void {
    this.message.set('Referência adicionada à lista do projeto.');
    this.reload();
  }

  reload(): void {
    this.version.update((v) => v + 1);
  }
}
