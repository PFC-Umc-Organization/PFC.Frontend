/** Demonstration only: fictitious people and projects, kept in memory. */
import { Shift } from '../../core/models';

export type TeacherRole = 'ADMIN' | 'ORIENTADOR' | 'BANCA';

export interface Teacher {
  id: string;
  name: string;
  role: TeacherRole;
}

export interface Student {
  rgm: string;
  name: string;
}

export interface Delivery {
  title: string;
  due: string;
  file?: string;
  link?: string;
}

export interface DemoProject {
  id: string;
  name: string;
  cohort: string;
  shift: Shift;
  advisorId: string;
  members: Student[];
  failedByPenalties: boolean;
  deliveries: Delivery[];
}

export type CriterionScope = 'GRUPO' | 'INDIVIDUAL';

export interface Criterion {
  id: string;
  section: string;
  title: string;
  scope: CriterionScope;
}

export interface Session {
  id: string;
  date: string;
  shift: Shift;
  presenterId: string;
  evaluatorIds: string[];
  start: string;
  minutes: number;
  slots: number;
}

export type BookingStatus = 'AGENDADA' | 'AUSENTE' | 'ENCERRADA';

export interface Booking {
  sessionId: string;
  slot: number;
  projectId: string;
  status: BookingStatus;
}

export type EvaluationStatus = 'RASCUNHO' | 'ENVIADA';

export interface Evaluation {
  projectId: string;
  teacherId: string;
  status: EvaluationStatus;
  group: Record<string, number>;
  /** RGM → criterion → score. */
  individual: Record<string, Record<string, number>>;
  comment: string;
  sentAt?: string;
}

/** What the coordination did with a reason: absences, reopenings, closings with missing evaluations. */
export interface LogEntry {
  projectId: string;
  at: string;
  text: string;
}

export interface DemoState {
  sessions: Session[];
  bookings: Booking[];
  evaluations: Evaluation[];
  log: LogEntry[];
}

export const MAX_COMMITTEE = 4;
export const MIN_COMMITTEE = 3;
export const SCORES = [0, 1, 2, 3, 4, 5];

export const TEACHERS: Teacher[] = [
  { id: 't-helena', name: 'Helena Duarte', role: 'ADMIN' },
  { id: 't-ricardo', name: 'Ricardo Menezes', role: 'ORIENTADOR' },
  { id: 't-camila', name: 'Camila Rocha', role: 'ORIENTADOR' },
  { id: 't-sergio', name: 'Sérgio Tavares', role: 'ORIENTADOR' },
  { id: 't-lucia', name: 'Lúcia Prado', role: 'ORIENTADOR' },
  { id: 't-otavio', name: 'Otávio Lima', role: 'BANCA' },
];

const ES_NIGHT = 'Engenharia de Software (Noite, 2026.2)';
const SI_MORNING = 'Sistemas de Informação (Manhã, 2026.2)';

const deliveries = (theme: string): Delivery[] => [
  { title: 'Proposta do projeto', due: '2026-09-14', file: `proposta-${theme}.pdf` },
  { title: 'Protótipo navegável', due: '2026-10-19', link: `https://exemplo.dev/${theme}` },
  { title: 'Monografia, versão final', due: '2026-11-23', file: `monografia-${theme}.pdf` },
];

export const PROJECTS: DemoProject[] = [
  {
    id: 'p-agendavet', name: 'AgendaVet', cohort: ES_NIGHT, shift: 'NOITE', advisorId: 't-ricardo', failedByPenalties: false,
    members: [{ rgm: '11230000101', name: 'Ana Ribeiro' }, { rgm: '11230000102', name: 'Bruno Farias' }, { rgm: '11230000103', name: 'Carla Nunes' }],
    deliveries: deliveries('agendavet'),
  },
  {
    id: 'p-rotaverde', name: 'Rota Verde', cohort: ES_NIGHT, shift: 'NOITE', advisorId: 't-camila', failedByPenalties: false,
    members: [{ rgm: '11230000104', name: 'Diego Martins' }, { rgm: '11230000105', name: 'Elisa Campos' }],
    deliveries: deliveries('rotaverde'),
  },
  {
    id: 'p-feirafacil', name: 'Feira Fácil', cohort: ES_NIGHT, shift: 'NOITE', advisorId: 't-lucia', failedByPenalties: false,
    members: [{ rgm: '11230000106', name: 'Felipe Antunes' }, { rgm: '11230000107', name: 'Gabriela Souza' }, { rgm: '11230000108', name: 'Henrique Lopes' }],
    deliveries: deliveries('feirafacil'),
  },
  {
    id: 'p-estudajunto', name: 'EstudaJunto', cohort: ES_NIGHT, shift: 'NOITE', advisorId: 't-ricardo', failedByPenalties: false,
    members: [{ rgm: '11230000109', name: 'Isabela Freitas' }, { rgm: '11230000110', name: 'João Pedro Alves' }],
    deliveries: deliveries('estudajunto'),
  },
  {
    id: 'p-parksmart', name: 'ParkSmart', cohort: ES_NIGHT, shift: 'NOITE', advisorId: 't-sergio', failedByPenalties: false,
    members: [{ rgm: '11230000111', name: 'Larissa Moura' }, { rgm: '11230000112', name: 'Marcelo Dias' }],
    deliveries: deliveries('parksmart'),
  },
  {
    id: 'p-clinica', name: 'Clínica Online', cohort: ES_NIGHT, shift: 'NOITE', advisorId: 't-camila', failedByPenalties: true,
    members: [{ rgm: '11230000113', name: 'Natália Pires' }, { rgm: '11230000114', name: 'Otávio Reis' }],
    deliveries: deliveries('clinica'),
  },
  {
    id: 'p-doamais', name: 'Doa+ Alimentos', cohort: SI_MORNING, shift: 'MANHA', advisorId: 't-sergio', failedByPenalties: false,
    members: [{ rgm: '11230000115', name: 'Paula Cardoso' }, { rgm: '11230000116', name: 'Rafael Teixeira' }],
    deliveries: deliveries('doamais'),
  },
  {
    id: 'p-meutreino', name: 'MeuTreino', cohort: SI_MORNING, shift: 'MANHA', advisorId: 't-lucia', failedByPenalties: false,
    members: [{ rgm: '11230000117', name: 'Sabrina Melo' }, { rgm: '11230000118', name: 'Thiago Barros' }],
    deliveries: deliveries('meutreino'),
  },
  {
    id: 'p-bibliotecaviva', name: 'Biblioteca Viva', cohort: SI_MORNING, shift: 'MANHA', advisorId: 't-camila', failedByPenalties: false,
    members: [{ rgm: '11230000119', name: 'Úrsula Brandão' }, { rgm: '11230000120', name: 'Vítor Hugo Lima' }],
    deliveries: deliveries('bibliotecaviva'),
  },
];

/** An example sheet, adapted from a published TCC evaluation form; the real criteria are still to be set. */
export const CRITERIA: Criterion[] = [
  { id: 'c-contribuicao', section: 'Planejamento e desenvolvimento', title: 'Contribuição teórica ou teórico-prática para a área', scope: 'GRUPO' },
  { id: 'c-introducao', section: 'Planejamento e desenvolvimento', title: 'Introdução: relação do problema com os objetivos', scope: 'GRUPO' },
  { id: 'c-metodologia', section: 'Planejamento e desenvolvimento', title: 'Metodologia clara e coerente com os objetivos', scope: 'GRUPO' },
  { id: 'c-referencial', section: 'Planejamento e desenvolvimento', title: 'Referencial teórico atualizado e adequado ao problema', scope: 'GRUPO' },
  { id: 'c-analise', section: 'Planejamento e desenvolvimento', title: 'Tratamento e análise dos dados e conclusões', scope: 'GRUPO' },
  { id: 'c-norma', section: 'Planejamento e desenvolvimento', title: 'Língua padrão e normas no trabalho escrito', scope: 'GRUPO' },
  { id: 'c-material', section: 'Apresentação', title: 'Qualidade e organização do material da apresentação', scope: 'GRUPO' },
  { id: 'c-dominio', section: 'Apresentação', title: 'Domínio do assunto, clareza e objetividade na exposição', scope: 'INDIVIDUAL' },
  { id: 'c-respostas', section: 'Apresentação', title: 'Esclarecimentos prestados à banca', scope: 'INDIVIDUAL' },
];

const sent = (projectId: string, teacherId: string, base: number, comment = ''): Evaluation => {
  const project = PROJECTS.find((p) => p.id === projectId)!;
  const score = (i: number) => Math.max(0, Math.min(5, base + ((i % 3) - 1)));
  return {
    projectId,
    teacherId,
    status: 'ENVIADA',
    group: Object.fromEntries(CRITERIA.filter((c) => c.scope === 'GRUPO').map((c, i) => [c.id, score(i)])),
    individual: Object.fromEntries(
      project.members.map((m, j) => [
        m.rgm,
        Object.fromEntries(CRITERIA.filter((c) => c.scope === 'INDIVIDUAL').map((c, i) => [c.id, score(i + j)])),
      ]),
    ),
    comment,
    sentAt: '2026-12-07T19:52:00',
  };
};

export function seed(): DemoState {
  return {
    sessions: [
      { id: 's-1', date: '2026-12-07', shift: 'NOITE', presenterId: 't-helena', evaluatorIds: ['t-ricardo', 't-camila'], start: '19:15', minutes: 40, slots: 4 },
      { id: 's-2', date: '2026-12-08', shift: 'MANHA', presenterId: 't-helena', evaluatorIds: ['t-sergio', 't-otavio', 't-lucia'], start: '08:15', minutes: 40, slots: 4 },
    ],
    bookings: [
      { sessionId: 's-1', slot: 0, projectId: 'p-agendavet', status: 'ENCERRADA' },
      { sessionId: 's-1', slot: 1, projectId: 'p-rotaverde', status: 'AGENDADA' },
      { sessionId: 's-1', slot: 2, projectId: 'p-feirafacil', status: 'AGENDADA' },
      { sessionId: 's-2', slot: 0, projectId: 'p-doamais', status: 'AGENDADA' },
    ],
    evaluations: [
      sent('p-agendavet', 't-helena', 4, 'Trabalho bem estruturado; a análise dos resultados pode ser aprofundada.'),
      sent('p-agendavet', 't-ricardo', 4),
      sent('p-agendavet', 't-camila', 3, 'Rever a formatação das referências conforme a ABNT.'),
      sent('p-rotaverde', 't-helena', 4),
      { ...sent('p-rotaverde', 't-ricardo', 3), status: 'RASCUNHO', individual: {}, sentAt: undefined },
    ],
    log: [],
  };
}
