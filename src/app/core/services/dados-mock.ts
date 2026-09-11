import {
  Atividade,
  Curso,
  Entrega,
  Material,
  Projeto,
  Usuario,
} from '../models';

/**
 * Semente de dados em memória.
 * Enquanto o backend em Go não estiver de pé, é isto que alimenta as telas.
 */

export const CURSOS_SEED: Curso[] = [
  {
    id: 'c-eng-noite',
    nome: 'Engenharia de Software',
    turno: 'NOITE',
    periodo: '2026.2',
  },
  {
    id: 'c-eng-manha',
    nome: 'Engenharia de Software',
    turno: 'MANHA',
    periodo: '2026.2',
  },
  {
    id: 'c-si-noite',
    nome: 'Sistemas de Informação',
    turno: 'NOITE',
    periodo: '2026.2',
  },
  {
    id: 'c-si-manha',
    nome: 'Sistemas de Informação',
    turno: 'MANHA',
    periodo: '2026.2',
  },
];

export const USUARIOS_SEED: Usuario[] = [
  {
    id: 'u-1',
    nome: 'Prof. Alessandro Horas',
    email: 'alessandro.horas@athena.edu',
    perfil: 'PROFESSOR',
    status: 'ATIVO',
    cursoIds: ['c-eng-noite', 'c-eng-manha', 'c-si-noite', 'c-si-manha'],
  },
  {
    id: 'u-2',
    nome: 'Pedro Silva',
    email: 'pedro.silva@athena.edu',
    perfil: 'ALUNO',
    status: 'ATIVO',
    cursoIds: ['c-eng-noite'],
  },
  {
    id: 'u-3',
    nome: 'Ana Costa',
    email: 'ana.costa@athena.edu',
    perfil: 'ALUNO',
    status: 'ATIVO',
    cursoIds: ['c-eng-noite'],
  },
  {
    id: 'u-4',
    nome: 'Rafael Moreira',
    email: 'rafael.moreira@athena.edu',
    perfil: 'ALUNO',
    status: 'ATIVO',
    cursoIds: ['c-eng-noite'],
  },
  {
    id: 'u-5',
    nome: 'Juliana Prado',
    email: 'juliana.prado@athena.edu',
    perfil: 'ALUNO',
    status: 'ATIVO',
    cursoIds: ['c-eng-noite'],
  },
  {
    id: 'u-6',
    nome: 'Marcos Tavares',
    email: 'marcos.tavares@athena.edu',
    perfil: 'ALUNO',
    status: 'ATIVO',
    cursoIds: ['c-eng-manha'],
  },
  {
    id: 'u-7',
    nome: 'Beatriz Lima',
    email: 'beatriz.lima@athena.edu',
    perfil: 'ALUNO',
    status: 'ATIVO',
    cursoIds: ['c-eng-manha'],
  },
  {
    id: 'u-8',
    nome: 'Camila Rocha',
    email: 'camila.rocha@athena.edu',
    perfil: 'ALUNO',
    status: 'ATIVO',
    cursoIds: ['c-si-noite'],
  },
  {
    id: 'u-9',
    nome: 'Diego Barbosa',
    email: 'diego.barbosa@athena.edu',
    perfil: 'ALUNO',
    status: 'ATIVO',
    cursoIds: ['c-si-noite'],
  },
];

export const PROJETOS_SEED: Projeto[] = [
  {
    id: 'p-athena',
    nome: 'Athena',
    descricao: 'Portal de acompanhamento de PFC para coordenação e alunos.',
    cursoId: 'c-eng-noite',
    integrantes: ['u-2', 'u-3'],
  },
  {
    id: 'p-web-cursos',
    nome: 'Web-Cursos',
    descricao: 'Plataforma de catálogo e matrícula em cursos livres.',
    cursoId: 'c-eng-noite',
    integrantes: ['u-4', 'u-5'],
  },
  {
    id: 'p-agenda-lab',
    nome: 'Agenda-Lab',
    descricao: 'Reserva de laboratórios e equipamentos do campus.',
    cursoId: 'c-eng-manha',
    integrantes: ['u-6', 'u-7'],
  },
  {
    id: 'p-almox',
    nome: 'Almoxarifado Digital',
    descricao: 'Controle de estoque e requisições internas.',
    cursoId: 'c-si-noite',
    integrantes: ['u-8', 'u-9'],
  },
];

/**
 * Cronograma institucional: estas atividades valem para TODOS os projetos.
 * Publicar uma nova aqui faz ela aparecer na timeline de todo grupo.
 */
export const ATIVIDADES_SEED: Atividade[] = [
  {
    id: 'a-1',
    titulo: 'Definição do Tema',
    descricao:
      'Enviar o tema do PFC com justificativa, objetivo geral e três objetivos específicos.',
    prazo: '2026-08-20T23:59:00',
    publicadaEm: '2026-08-01T09:00:00',
  },
  {
    id: 'a-2',
    titulo: 'Revisão Bibliográfica',
    descricao:
      'Levantamento de no mínimo 15 referências, com fichamento das 5 principais.',
    prazo: '2026-09-05T23:59:00',
    publicadaEm: '2026-08-10T09:00:00',
  },
  {
    id: 'a-3',
    titulo: 'Diagrama de Sistemas',
    descricao:
      'Diagramas de casos de uso, classes e componentes da solução proposta.',
    prazo: '2026-10-15T23:59:00',
    publicadaEm: '2026-08-20T09:00:00',
  },
  {
    id: 'a-4',
    titulo: 'Apresentação Final',
    descricao:
      'Slides da defesa e versão final do documento, prontos para a banca.',
    prazo: '2026-11-28T20:00:00',
    publicadaEm: '2026-08-20T09:00:00',
  },
];

/**
 * Entregas efetivamente registradas, por projeto. O que não está aqui é
 * considerado não entregue — e o status (pendente ou atrasado) sai da
 * comparação do prazo com a data corrente.
 */
export const ENTREGAS_SEED: Entrega[] = [
  {
    id: 'e-1',
    atividadeId: 'a-1',
    projetoId: 'p-athena',
    entregueEm: '2026-08-19T21:10:00',
  },
  {
    id: 'e-2',
    atividadeId: 'a-2',
    projetoId: 'p-athena',
    entregueEm: '2026-09-04T22:02:00',
  },
  {
    id: 'e-3',
    atividadeId: 'a-1',
    projetoId: 'p-web-cursos',
    entregueEm: '2026-08-18T14:35:00',
  },
  {
    id: 'e-4',
    atividadeId: 'a-1',
    projetoId: 'p-agenda-lab',
    entregueEm: '2026-08-21T08:15:00',
  },
  {
    id: 'e-5',
    atividadeId: 'a-1',
    projetoId: 'p-almox',
    entregueEm: '2026-08-20T19:40:00',
  },
  {
    id: 'e-6',
    atividadeId: 'a-2',
    projetoId: 'p-almox',
    entregueEm: '2026-09-05T23:10:00',
  },
];

export const MATERIAIS_SEED: Material[] = [
  {
    id: 'm-1',
    titulo: 'Modelo oficial de PFC (ABNT)',
    descricao:
      'Arquivo .docx com estilos, capa, folha de aprovação e sumário já configurados.',
    tipo: 'MODELO',
    url: 'https://exemplo.athena.edu/modelo-pfc.docx',
    cursoId: null,
    publicadoEm: '2026-08-01T10:00:00',
  },
  {
    id: 'm-2',
    titulo: 'Guia de normalização de referências',
    descricao: 'Como citar artigos, normas técnicas, teses e fontes web.',
    tipo: 'DOCUMENTO',
    url: 'https://exemplo.athena.edu/guia-referencias.pdf',
    cursoId: null,
    publicadoEm: '2026-08-05T10:00:00',
  },
  {
    id: 'm-3',
    titulo: 'Aula 03 — Estruturando a revisão bibliográfica',
    descricao: 'Gravação da aula com o roteiro de busca em bases indexadas.',
    tipo: 'VIDEO',
    url: 'https://exemplo.athena.edu/aula-03',
    cursoId: 'c-eng-noite',
    publicadoEm: '2026-08-12T10:00:00',
  },
  {
    id: 'm-4',
    titulo: 'Critérios de avaliação da banca',
    descricao: 'Planilha com pesos de cada critério e a rubrica usada na defesa.',
    tipo: 'DOCUMENTO',
    url: 'https://exemplo.athena.edu/rubrica-banca.xlsx',
    cursoId: null,
    publicadoEm: '2026-08-22T10:00:00',
  },
];

/** Senha aceita por qualquer usuário enquanto o login é mockado. */
export const SENHA_MOCK = 'athena123';
