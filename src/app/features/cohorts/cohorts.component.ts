import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { CohortSectionComponent } from './cohort-section/cohort-section.component';
import { CohortsStore } from './cohorts.store';
import { CourseSectionComponent } from './course-section/course-section.component';

type Section = 'courses' | 'cohorts';

/** A cohort is a registered course in a shift and term. */
@Component({
  selector: 'app-cohorts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CourseSectionComponent, CohortSectionComponent],
  providers: [CohortsStore],
  templateUrl: './cohorts.component.html',
})
export class CohortsComponent {
  readonly sections: { id: Section; label: string }[] = [
    { id: 'courses', label: 'Cursos' },
    { id: 'cohorts', label: 'Turmas' },
  ];
  readonly section = signal<Section>('courses');
}
