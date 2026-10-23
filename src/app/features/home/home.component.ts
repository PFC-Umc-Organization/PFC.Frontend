import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { isStaff } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { StaffHomeComponent } from './staff-home/staff-home.component';
import { StudentHomeComponent } from './student-home/student-home.component';

/** Each role mounts only its own panel, and makes only its own calls. */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StaffHomeComponent, StudentHomeComponent],
  template: `
    <div class="page">
      @if (staff()) {
        <app-staff-home />
      } @else {
        <app-student-home />
      }
    </div>
  `,
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  readonly staff = computed(() => isStaff(this.auth.role()));
}
