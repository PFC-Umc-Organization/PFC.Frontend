import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, combineLatest, of, startWith, switchMap } from 'rxjs';

import { MessageResponse, ROLE_LABEL, Role, User } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
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
  private readonly confirmation = inject(ConfirmationService);
  /** Nobody changes their own role or disables themselves; the backend refuses it too. */
  private readonly auth = inject(AuthService);
  protected readonly myId = computed(() => this.auth.user()?.id ?? '');

  protected readonly roleLabel = ROLE_LABEL;
  readonly search = signal('');
  readonly role = signal<Role | 'TODOS'>('TODOS');
  readonly error = signal('');
  readonly canAdd = input(true);
  readonly add = output();

  /** Bumped after every change, which also clears the service's cache. */
  private readonly reload$ = new Subject<void>();

  /** The service caches the list, so filtering makes no new call. */
  readonly users = toSignal(
    combineLatest([
      toObservable(computed(() => ({ search: this.search(), role: this.role() }))),
      this.reload$.pipe(startWith(undefined)),
    ]).pipe(
      switchMap(([filter]) =>
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
  private readonly everyone = toSignal(
    this.reload$.pipe(
      startWith(undefined),
      switchMap(() => this.userService.list().pipe(catchError(() => of([] as User[])))),
    ),
    { initialValue: [] as User[] },
  );
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

  readonly done = signal('');
  readonly busyId = signal<string | null>(null);
  readonly renamingId = signal<string | null>(null);
  readonly newName = signal('');

  startRename(u: User): void {
    this.renamingId.set(u.id);
    this.newName.set(u.nome === u.email ? '' : u.nome);
  }

  setNewName(event: Event): void {
    this.newName.set((event.target as HTMLInputElement).value);
  }

  rename(u: User): void {
    const name = this.newName().trim();
    if (!name) {
      this.error.set('Informe o nome.');
      return;
    }
    this.run(u, this.userService.rename(u.id, name), () => this.renamingId.set(null));
  }

  async changeRole(u: User): Promise<void> {
    const to = u.perfil === 'ADMIN' ? 'ORIENTADOR' : 'ADMIN';
    const consequence =
      to === 'ADMIN'
        ? 'A pessoa passa a administrar turmas, contas e atividades e deixa de constar como orientadora dos projetos que orienta.'
        : 'A pessoa deixa de administrar turmas, contas e atividades e passa a acompanhar apenas os projetos que orientar.';
    const confirmed = await this.confirmation.confirm({
      title: 'Trocar perfil',
      message: `Mudar o perfil de ${u.nome} de ${this.roleLabel[u.perfil]} para ${this.roleLabel[to]}? ${consequence} A mudança vale a partir da próxima entrada da pessoa no portal.`,
      confirmText: 'Trocar perfil',
    });
    if (confirmed) {
      this.run(u, this.userService.changeRole(u.id, to));
    }
  }

  async disable(u: User): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Desativar conta',
      message: `Desativar a conta de ${u.nome}? A pessoa não consegue mais entrar no portal e as sessões abertas são encerradas; o acesso já em uso pode durar até uma hora. Os dados da conta e o que ela enviou são mantidos, e a conta pode ser reativada depois.`,
      confirmText: 'Desativar',
      danger: true,
    });
    if (confirmed) {
      this.run(u, this.userService.disable(u.id));
    }
  }

  enable(u: User): void {
    this.run(u, this.userService.enable(u.id));
  }

  resendInvitation(u: User): void {
    this.run(u, this.userService.resendInvitation(u.id));
  }

  private run(u: User, request: Observable<MessageResponse>, after?: () => void): void {
    this.error.set('');
    this.done.set('');
    this.busyId.set(u.id);
    request.subscribe({
      next: ({ mensagem }) => {
        this.busyId.set(null);
        this.done.set(mensagem);
        after?.();
        this.reload$.next();
      },
      error: (e: Error) => {
        this.busyId.set(null);
        this.error.set(e.message);
      },
    });
  }
}
