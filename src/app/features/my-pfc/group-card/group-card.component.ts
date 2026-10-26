import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { ProjectDetail, cohortLabel, rgmOf } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';

/** The group's cohort, advisor and members; the page title already names the project. */
@Component({
  selector: 'app-group-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-card.component.html',
  styleUrl: './group-card.component.scss',
})
export class GroupCardComponent {
  readonly detail = input.required<ProjectDetail>();
  protected readonly cohortLabel = cohortLabel;
  private readonly auth = inject(AuthService);
  protected readonly myRgm = computed(() => rgmOf(this.auth.user()));
}
