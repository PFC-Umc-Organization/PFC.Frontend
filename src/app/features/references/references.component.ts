import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Project, Reference, isStaff } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ReferenceService } from '../../core/services/reference.service';
import { loadable } from '../../core/state/loadable';
import { IconComponent } from '../../shared/components/icon/icon.component';
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
  imports: [IconComponent, TopicSearchComponent, DoiLookupComponent, ReferenceListComponent, RouterLink],
  templateUrl: './references.component.html',
  styleUrl: './references.component.scss',
})
export class ReferencesComponent {
  private readonly auth = inject(AuthService);
  private readonly projectService = inject(ProjectService);
  private readonly referenceService = inject(ReferenceService);

  readonly staff = computed(() => isStaff(this.auth.role()));

  /** The student's own PFC; no call for the staff. */
  private readonly studentProject = loadable({
    source: () => this.projectService.myProject(),
    params: computed(() => (this.staff() ? null : true)),
    initial: null as Project | null,
  });

  /** For the staff's picker; the backend returns an advisor only their projects. */
  readonly projects = loadable({
    source: () => this.projectService.list(),
    params: computed(() => (this.staff() ? true : null)),
    initial: [] as Project[],
  });
  private readonly chosen = signal('');

  readonly projectError = computed(() => (this.staff() ? this.projects.error() : this.studentProject.error()));

  retryProject(): void {
    (this.staff() ? this.projects : this.studentProject).reload();
  }

  readonly project = computed<Project | null>(() => {
    if (!this.staff()) {
      return this.studentProject.value();
    }
    const list = this.projects.value();
    return list.find((p) => p.id === this.chosen()) ?? list[0] ?? null;
  });

  private readonly projectId = computed(() => this.project()?.id || null);
  private readonly referenceList = loadable({
    source: (id: string) => this.referenceService.ofProject(id),
    params: this.projectId,
    initial: [] as Reference[],
  });
  readonly references = this.referenceList.value;
  readonly loading = this.referenceList.loading;
  readonly loadError = this.referenceList.error;

  readonly dois = computed(() => new Set(this.references().map((r) => r.doi.toLowerCase())));

  readonly mode = signal<Mode>('topic');
  /** Switching tabs clears the previous action's message. */
  readonly message = linkedSignal({ source: this.mode, computation: () => '' });

  choose(event: Event): void {
    this.chosen.set((event.target as HTMLSelectElement).value);
  }

  added(): void {
    this.message.set('Referência adicionada à lista do projeto.');
    this.reload();
  }

  reload(): void {
    this.referenceList.reload();
  }
}
