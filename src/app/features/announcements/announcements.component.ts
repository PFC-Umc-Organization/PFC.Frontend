import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { ANNOUNCEMENT_LIMITS, Announcement, Cohort, cohortLabel, isStaff } from '../../core/models';
import { AnnouncementService } from '../../core/services/announcement.service';
import { AuthService } from '../../core/services/auth.service';
import { CohortService } from '../../core/services/cohort.service';
import { ConfirmationService } from '../../core/services/confirmation.service';
import { action } from '../../core/state/action';
import { loadable } from '../../core/state/loadable';
import { IconComponent } from '../../shared/components/icon/icon.component';

// Componente
@Component({
  selector: 'app-announcements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule, IconComponent],
  templateUrl: './announcements.component.html',
  styleUrl: './announcements.component.scss',
})
export class AnnouncementsComponent {
  private readonly auth = inject(AuthService);
  private readonly announcementService = inject(AnnouncementService);
  private readonly cohortService = inject(CohortService);
  private readonly confirmation = inject(ConfirmationService);

  readonly staff = computed(() => isStaff(this.auth.role()));
  protected readonly limits = ANNOUNCEMENT_LIMITS;

  // ---------------------------------------------------------------------------
  // Dados
  // ---------------------------------------------------------------------------

  readonly cohorts = loadable({
    source: () => this.cohortService.list(),
    params: computed(() => (this.staff() ? true : null)),
    initial: [] as Cohort[],
  });
  readonly list = loadable({ source: () => this.announcementService.list(), initial: [] as Announcement[] });

  // Público
  audience(a: Announcement): string {
    if (!a.turmaId) {
      return 'Todas as turmas';
    }
    if (!this.staff()) {
      return 'Para a sua turma';
    }
    const cohort = this.cohorts.value().find((c) => c.id === a.turmaId);
    return cohort ? cohortLabel(cohort) : this.cohorts.error() ? 'Turma não identificada' : 'Turma removida';
  }

  // Permissão
  canRemove(a: Announcement): boolean {
    const user = this.auth.user();
    return user?.perfil === 'ADMIN' || (user?.perfil === 'ORIENTADOR' && a.autorId === user.id);
  }

  // ---------------------------------------------------------------------------
  // Publicação
  // ---------------------------------------------------------------------------

  readonly formOpen = signal(false);
  readonly done = signal('');
  protected readonly cohortLabel = cohortLabel;

  readonly form = inject(FormBuilder).nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(ANNOUNCEMENT_LIMITS.titulo)]],
    conteudo: ['', [Validators.required, Validators.maxLength(ANNOUNCEMENT_LIMITS.conteudo)]],
    turmaId: [''],
  });

  private readonly publishAction = action(
    (body: Parameters<AnnouncementService['create']>[0]) => this.announcementService.create(body),
    {
      onSuccess: () => {
        this.form.reset({ titulo: '', conteudo: '', turmaId: '' });
        this.formOpen.set(false);
        this.done.set('Aviso publicado.');
      },
    },
  );
  readonly publishing = this.publishAction.pending;
  readonly publishError = this.publishAction.error;

  private readonly removeAction = action((id: string) => this.announcementService.remove(id), {
    onSuccess: () => this.done.set('Aviso excluído.'),
    concurrency: 'merge',
  });
  readonly removing = this.removeAction.pending;
  readonly removeError = this.removeAction.error;

  // Abertura
  open(): void {
    this.done.set('');
    this.formOpen.set(true);
  }

  // Validação
  invalid(name: 'titulo' | 'conteudo'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  // Publicação
  async publish(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { titulo, conteudo, turmaId } = this.form.getRawValue();
    const target = this.cohorts.value().find((c) => c.id === turmaId);
    const confirmed = await this.confirmation.confirm({
      title: 'Publicar aviso',
      message: `Publicar o aviso "${titulo.trim()}" para ${target ? cohortLabel(target) : 'todas as turmas'}? Os alunos passam a vê-lo na tela inicial.`,
      confirmText: 'Publicar',
    });
    if (!confirmed) {
      return;
    }
    this.done.set('');
    this.publishAction.run({ titulo: titulo.trim(), conteudo: conteudo.trim(), turmaId: turmaId || null });
  }

  // Exclusão
  async remove(a: Announcement): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: 'Excluir aviso',
      message: `Excluir o aviso "${a.titulo}"? Ele deixa de ser exibido aos alunos. Esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      danger: true,
    });
    if (confirmed) {
      this.done.set('');
      this.removeAction.run(a.id);
    }
  }
}
