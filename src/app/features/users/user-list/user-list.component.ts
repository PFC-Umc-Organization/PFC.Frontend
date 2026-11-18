import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { Cohort, MessageResponse, ROLE_LABEL, Role, User, cohortLabel } from '../../../core/models';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { UserService } from '../../../core/services/user.service';
import { action } from '../../../core/state/action';
import { loadable } from '../../../core/state/loadable';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ScrollHintDirective } from '../../../shared/directives/scroll-hint.directive';

// Componente
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
  private readonly auth = inject(AuthService);
  protected readonly myId = computed(() => this.auth.user()?.id ?? '');

  protected readonly roleLabel = ROLE_LABEL;

  // ---------------------------------------------------------------------------
  // Filtros
  // ---------------------------------------------------------------------------

  readonly search = signal('');
  readonly role = signal<Role | 'TODOS'>('TODOS');
  // Filtro
  readonly cohortId = signal('');
  // Turmas
  readonly cohorts = input<Cohort[]>([]);
  protected readonly cohortLabel = cohortLabel;
  readonly canAdd = input(true);
  readonly add = output();

  readonly users = loadable({
    source: (filter: { search: string; role: Role | 'TODOS'; cohortId: string }) => this.userService.list(filter),
    params: computed(() => ({ search: this.search(), role: this.role(), cohortId: this.cohortId() })),
    initial: [] as User[],
  });

  private readonly everyone = loadable({ source: () => this.userService.list(), initial: [] as User[] });

  readonly loadError = computed(() => this.users.error() || this.everyone.error());
  readonly stats = computed(() => {
    const all = this.everyone.value();
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

  // Recarga
  reload(): void {
    this.users.reload();
    this.everyone.reload();
  }

  // Busca
  setSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  // Atribuição
  setCohort(event: Event): void {
    this.cohortId.set((event.target as HTMLSelectElement).value);
  }

  setRole(event: Event): void {
    this.role.set((event.target as HTMLSelectElement).value as Role | 'TODOS');
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

  readonly done = signal('');
  private readonly missingName = signal('');
  private readonly change = action(
    (_id: string, request: Observable<MessageResponse>, _after?: () => void) => request,
    {
      onSuccess: ({ mensagem }, _id, _request, after) => {
        this.done.set(mensagem);
        after?.();
        this.reload();
      },
    },
  );
  readonly busy = this.change.pending;
  readonly error = computed(() => this.missingName() || this.change.error());
  readonly renamingId = signal<string | null>(null);
  readonly newName = signal('');

  // Renomeação
  startRename(u: User): void {
    this.renamingId.set(u.id);
    this.newName.set(u.nome === u.email ? '' : u.nome);
  }

  // Atribuição
  setNewName(event: Event): void {
    this.newName.set((event.target as HTMLInputElement).value);
  }

  // Renomeação
  async rename(u: User): Promise<void> {
    const name = this.newName().trim();
    this.missingName.set('');
    if (!name) {
      this.missingName.set('Informe o nome.');
      return;
    }
    const confirmed = await this.confirmation.confirm({
      title: 'Corrigir nome',
      message: `Salvar o nome desta conta como "${name}"?`,
      confirmText: 'Salvar',
    });
    if (!confirmed) {
      return;
    }
    this.run(u, this.userService.rename(u.id, name), () => this.renamingId.set(null));
  }

  // Troca de perfil
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

  // Desativação
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

  // Ativação
  async enable(u: User): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Reativar conta',
      message: `Reativar a conta de ${u.nome}? A pessoa volta a poder entrar no portal.`,
      confirmText: 'Reativar',
    });
    if (confirmed) {
      this.run(u, this.userService.enable(u.id));
    }
  }

  async resendInvitation(u: User): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Reenviar convite',
      message: `Reenviar o convite de primeiro acesso para ${u.email}? Uma nova senha temporária é enviada por e-mail.`,
      confirmText: 'Reenviar',
    });
    if (confirmed) {
      this.run(u, this.userService.resendInvitation(u.id));
    }
  }

  // Alternância
  async toggleMfa(u: User): Promise<void> {
    const enable = !u.mfaAtivo;
    const confirmed = await this.confirmation.confirm({
      title: enable ? 'Ativar MFA' : 'Desativar MFA',
      message: enable
        ? `Ativar a verificação em duas etapas da conta de ${u.nome}? A pessoa precisa ter configurado um aplicativo autenticador e passa a informar um código a cada entrada.`
        : `Desativar a verificação em duas etapas da conta de ${u.nome}? A pessoa volta a entrar apenas com e-mail e senha.`,
      confirmText: enable ? 'Ativar' : 'Desativar',
      danger: !enable,
    });
    if (confirmed) {
      this.run(u, this.userService.toggleMfa(u.id, enable));
    }
  }

  // Execução
  private run(u: User, request: Observable<MessageResponse>, after?: () => void): void {
    if (this.change.pending()) {
      return;
    }
    this.missingName.set('');
    this.done.set('');
    this.change.run(u.id, request, after);
  }
}
