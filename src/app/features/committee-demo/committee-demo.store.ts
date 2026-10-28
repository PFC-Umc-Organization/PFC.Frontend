import { Injectable, computed, signal } from '@angular/core';

import { SHIFT_LABEL, Shift } from '../../core/models';
import {
  Booking,
  CRITERIA,
  DemoProject,
  DemoState,
  Evaluation,
  MAX_COMMITTEE,
  MIN_COMMITTEE,
  PROJECTS,
  Session,
  TEACHERS,
  Teacher,
  seed,
} from './committee-demo.data';

export type CommitteeRole = 'Apresentador' | 'Avaliador' | 'Orientador do projeto';

export interface CommitteeMember {
  teacher: Teacher;
  role: CommitteeRole;
  /** The project's advisor, also when they are a fixed member of the session. */
  advisor: boolean;
}

export interface Candidate {
  project: DemoProject;
  size: number;
  /** Why the project cannot take this slot; empty when it can. */
  blocked: string;
  warning: string;
}

export interface NewSession {
  date: string;
  shift: Shift;
  presenterId: string;
  evaluatorIds: string[];
  start: string;
  minutes: number;
  slots: number;
}

export interface Result {
  group: number;
  students: { rgm: string; name: string; individual: number; final: number }[];
  comments: string[];
  sent: number;
}

const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

export const formatScore = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function sessionLabel(s: Session): string {
  const [y, m, d] = s.date.split('-');
  const weekday = new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('pt-BR', { weekday: 'long' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${d}/${m}/${y} · ${SHIFT_LABEL[s.shift]}`;
}

export function slotTime(s: Session, slot: number): string {
  const [h, m] = s.start.split(':').map(Number);
  const total = h * 60 + m + slot * s.minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** The whole demonstration lives here, in memory: reloading the page starts over. */
@Injectable()
export class CommitteeDemoStore {
  private readonly state = signal<DemoState>(seed());

  readonly teachers = TEACHERS;
  readonly projects = PROJECTS;
  readonly criteria = CRITERIA;
  readonly groupCriteria = CRITERIA.filter((c) => c.scope === 'GRUPO');
  readonly individualCriteria = CRITERIA.filter((c) => c.scope === 'INDIVIDUAL');
  readonly presenters = TEACHERS.filter((t) => t.role === 'ADMIN');
  readonly evaluatorPool = TEACHERS.filter((t) => t.role !== 'ADMIN');

  readonly sessions = computed(() =>
    [...this.state().sessions].sort((a, b) => `${a.date}${a.shift}`.localeCompare(`${b.date}${b.shift}`)),
  );
  readonly bookings = computed(() => this.state().bookings);
  readonly log = computed(() => this.state().log);
  readonly failedProjects = PROJECTS.filter((p) => p.failedByPenalties);

  reset(): void {
    this.state.set(seed());
  }

  teacher(id: string): Teacher {
    return TEACHERS.find((t) => t.id === id)!;
  }

  project(id: string): DemoProject {
    return PROJECTS.find((p) => p.id === id)!;
  }

  session(id: string): Session {
    return this.state().sessions.find((s) => s.id === id)!;
  }

  bookingAt(sessionId: string, slot: number): Booking | undefined {
    return this.state().bookings.find((b) => b.sessionId === sessionId && b.slot === slot);
  }

  bookingOf(projectId: string): Booking | undefined {
    return this.state().bookings.find((b) => b.projectId === projectId);
  }

  /** The session's fixed members plus the project's advisor, who counts once. */
  committee(session: Session, project: DemoProject): CommitteeMember[] {
    const members: CommitteeMember[] = [
      { teacher: this.teacher(session.presenterId), role: 'Apresentador', advisor: false },
      ...session.evaluatorIds.map((id) => ({ teacher: this.teacher(id), role: 'Avaliador' as const, advisor: false })),
    ];
    const advisor = members.find((m) => m.teacher.id === project.advisorId);
    if (advisor) {
      advisor.advisor = true;
    } else {
      members.push({ teacher: this.teacher(project.advisorId), role: 'Orientador do projeto', advisor: true });
    }
    return members;
  }

  committeeOf(projectId: string): CommitteeMember[] {
    const booking = this.bookingOf(projectId);
    return booking ? this.committee(this.session(booking.sessionId), this.project(projectId)) : [];
  }

  /** Every project without a slot, failed ones left out; the ones that do not fit say why. */
  candidates(sessionId: string): Candidate[] {
    const session = this.session(sessionId);
    return PROJECTS.filter((p) => !p.failedByPenalties && !this.bookingOf(p.id))
      .map((project) => {
        const size = this.committee(session, project).length;
        let blocked = '';
        if (size > MAX_COMMITTEE) {
          blocked = `A banca ficaria com ${size} pessoas: o orientador não é membro fixo desta sessão e o limite é ${MAX_COMMITTEE}.`;
        } else if (size < MIN_COMMITTEE) {
          blocked = `A banca ficaria com ${size} pessoas, e o mínimo é ${MIN_COMMITTEE}.`;
        }
        const warning = project.shift === session.shift ? '' : `Turma do turno da ${SHIFT_LABEL[project.shift].toLowerCase()}.`;
        return { project, size, blocked, warning };
      })
      .sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked) || a.project.name.localeCompare(b.project.name));
  }

  addSession(input: NewSession): string {
    if (this.state().sessions.some((s) => s.date === input.date && s.shift === input.shift)) {
      return 'Já existe uma sessão nesta data e neste turno. Só pode haver uma sessão por vez.';
    }
    const fixed = new Set([input.presenterId, ...input.evaluatorIds]).size;
    if (fixed > MAX_COMMITTEE) {
      return `A sessão pode ter no máximo ${MAX_COMMITTEE} membros fixos, contando o apresentador.`;
    }
    if (fixed < 2) {
      return 'Escolha ao menos um avaliador além do apresentador.';
    }
    const session: Session = { ...input, id: `s-${Date.now()}`, evaluatorIds: input.evaluatorIds.filter((id) => id !== input.presenterId) };
    this.state.update((s) => ({ ...s, sessions: [...s.sessions, session] }));
    return '';
  }

  removeSession(sessionId: string): void {
    this.state.update((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== sessionId) }));
  }

  lastPresenterId(): string {
    return this.sessions().at(-1)?.presenterId ?? this.presenters[0].id;
  }

  book(sessionId: string, slot: number, projectId: string): void {
    this.state.update((s) => ({ ...s, bookings: [...s.bookings, { sessionId, slot, projectId, status: 'AGENDADA' }] }));
  }

  /** Only before anyone has sent an evaluation; drafts go with it. */
  unbook(projectId: string): void {
    this.state.update((s) => ({
      ...s,
      bookings: s.bookings.filter((b) => b.projectId !== projectId),
      evaluations: s.evaluations.filter((e) => e.projectId !== projectId),
    }));
  }

  markAbsent(projectId: string): void {
    this.setStatus(projectId, 'AUSENTE');
    this.record(projectId, 'Ausência registrada: o grupo não compareceu e foi reprovado.');
  }

  revertAbsence(projectId: string, reason: string): void {
    this.setStatus(projectId, 'AGENDADA');
    this.record(projectId, `Ausência revertida. Motivo: ${reason}`);
  }

  /** Frees the slot: the group goes back to the list and is placed again. */
  reschedule(projectId: string, reason: string): void {
    this.unbook(projectId);
    this.record(projectId, `Apresentação reagendada. Justificativa: ${reason}`);
  }

  close(projectId: string, reason = ''): void {
    this.setStatus(projectId, 'ENCERRADA');
    if (reason) {
      this.record(projectId, `Banca encerrada sem todas as avaliações. Motivo: ${reason}`);
    }
  }

  /** The members can change their evaluations again until it is closed once more. */
  reopen(projectId: string, reason: string): void {
    this.state.update((s) => ({
      ...s,
      bookings: s.bookings.map((b) => (b.projectId === projectId ? { ...b, status: 'AGENDADA' } : b)),
      evaluations: s.evaluations.map((e) => (e.projectId === projectId ? { ...e, status: 'RASCUNHO' } : e)),
    }));
    this.record(projectId, `Banca reaberta. Motivo: ${reason}`);
  }

  evaluation(projectId: string, teacherId: string): Evaluation | undefined {
    return this.state().evaluations.find((e) => e.projectId === projectId && e.teacherId === teacherId);
  }

  evaluations(projectId: string): Evaluation[] {
    return this.state().evaluations.filter((e) => e.projectId === projectId);
  }

  saveEvaluation(e: Evaluation): void {
    this.state.update((s) => ({
      ...s,
      evaluations: [...s.evaluations.filter((x) => !(x.projectId === e.projectId && x.teacherId === e.teacherId)), e],
    }));
  }

  /** Provisional rule, still to be confirmed: each student's grade is the mean of the group and individual scores. */
  result(projectId: string): Result {
    const project = this.project(projectId);
    const sent = this.evaluations(projectId).filter((e) => e.status === 'ENVIADA');
    const groupOf = (e: Evaluation) => average(this.groupCriteria.map((c) => e.group[c.id] ?? 0));
    const individualOf = (e: Evaluation, rgm: string) => average(this.individualCriteria.map((c) => e.individual[rgm]?.[c.id] ?? 0));
    const group = average(sent.map(groupOf));
    return {
      group,
      students: project.members.map((m) => {
        const individual = average(sent.map((e) => individualOf(e, m.rgm)));
        return { ...m, individual, final: (group + individual) / 2 };
      }),
      comments: sent.map((e) => e.comment.trim()).filter(Boolean),
      sent: sent.length,
    };
  }

  private setStatus(projectId: string, status: Booking['status']): void {
    this.state.update((s) => ({ ...s, bookings: s.bookings.map((b) => (b.projectId === projectId ? { ...b, status } : b)) }));
  }

  private record(projectId: string, text: string): void {
    this.state.update((s) => ({ ...s, log: [...s.log, { projectId, at: new Date().toISOString(), text }] }));
  }
}
