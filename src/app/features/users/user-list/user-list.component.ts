import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

import { ROLE_LABEL, Role, User } from '../../../core/models';
import { UserService } from '../../../core/services/user.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

@Component({
  selector: 'app-user-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent, ScrollHintDirective],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss',
})
export class UserListComponent {
  private readonly userService = inject(UserService);

  protected readonly roleLabel = ROLE_LABEL;
  readonly search = signal('');
  readonly role = signal<Role | 'TODOS'>('TODOS');
  readonly error = signal('');
  readonly canAdd = input(true);
  readonly add = output();

  /** The service caches the list, so filtering makes no new call. */
  readonly users = toSignal(
    toObservable(computed(() => ({ search: this.search(), role: this.role() }))).pipe(
      switchMap((filter) =>
        this.userService.list(filter).pipe(
          catchError((e: Error) => {
            this.error.set(e.message);
            return of([] as User[]);
          }),
        ),
      ),
    ),
    { initialValue: [] as User[] },
  );

  /** Counted over everyone, regardless of the filters. */
  private readonly everyone = toSignal(this.userService.list().pipe(catchError(() => of([] as User[]))), {
    initialValue: [] as User[],
  });
  readonly stats = computed(() => {
    const all = this.everyone();
    const count = (role: Role) => all.filter((u) => u.perfil === role).length;
    return {
      total: all.length,
      byRole: [
        { label: count('ALUNO') === 1 ? 'aluno' : 'alunos', value: count('ALUNO') },
        { label: count('ORIENTADOR') === 1 ? 'orientador' : 'orientadores', value: count('ORIENTADOR') },
        { label: 'na coordenação', value: count('ADMIN') },
      ],
    };
  });

  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setRole(event: Event): void {
    this.role.set((event.target as HTMLSelectElement).value as Role | 'TODOS');
  }
}
