import {
  PASSWORD_RULE,
  cohortLabel,
  currentTerm,
  fileNameOf,
  fileProblem,
  isInTerm,
  isStoredFile,
  parseClassmates,
  rgmOf,
} from '.';
import type { Cohort, User } from '.';

const cohort: Cohort = { id: 't1', nome: 'Engenharia de Software', turno: 'NOITE', periodo: '2026.2' };

describe('cohorts', () => {
  it('are labeled with course, shift and term', () => {
    expect(cohortLabel(cohort)).toBe('Engenharia de Software (Noite, 2026.2)');
  });

  it('put Jan–Jun in term .1 and Jul–Dec in .2', () => {
    expect(currentTerm(new Date(2026, 0, 10))).toBe('2026.1');
    expect(currentTerm(new Date(2026, 5, 30))).toBe('2026.1');
    expect(currentTerm(new Date(2026, 6, 1))).toBe('2026.2');
  });

  it('accept the old spellings of the term', () => {
    for (const p of ['2026.2', '2026/2', '2026-2', ' 2026.2 ']) {
      expect(isInTerm({ ...cohort, periodo: p }, '2026.2')).toBe(true);
    }
    expect(isInTerm(cohort, '2026.1')).toBe(false);
  });
});

describe('parseClassmates', () => {
  it('splits on comma, space and line break, without repeats or the creator', () => {
    expect(parseClassmates('111, 222;333\n222 999', '999')).toEqual({ rgms: ['111', '222', '333'] });
  });

  it('refuses an RGM with letters', () => {
    expect(parseClassmates('111, 12a', '999')).toEqual({
      erro: '"12a" não é um RGM válido. Use só números.',
    });
  });

  it('refuses more than 9 classmates (a group has up to 10 people)', () => {
    const ten = Array.from({ length: 10 }, (_, i) => String(100 + i)).join(',');
    expect('erro' in parseClassmates(ten, '999')).toBe(true);
  });
});

describe('files', () => {
  const file = (name: string, size: number) => new File([new Uint8Array(size)], name);

  it('accept the backend types, in any case', () => {
    expect(fileProblem(file('Monografia.PDF', 10))).toBe('');
    expect(fileProblem(file('slides.pptx', 10))).toBe('');
  });

  it('refuse a forbidden type, an empty file and over 50 MB', () => {
    expect(fileProblem(file('virus.exe', 10))).toContain('Tipo de arquivo não aceito');
    expect(fileProblem(file('sem-extensao', 10))).toContain('Tipo de arquivo não aceito');
    expect(fileProblem(file('vazio.pdf', 0))).toBe('O arquivo está vazio.');
    expect(fileProblem({ name: 'grande.pdf', size: 50 * 1024 * 1024 + 1 } as File)).toBe('O arquivo passa de 50 MB.');
  });

  it('show only the name of a stored file and keep old submissions as they are', () => {
    const key = 'entregas/p1/a1/c1/u1/Monografia Final.pdf';
    expect(isStoredFile(key)).toBe(true);
    expect(fileNameOf(key)).toBe('Monografia Final.pdf');
    expect(isStoredFile('monografia.pdf')).toBe(false);
    expect(fileNameOf('monografia.pdf')).toBe('monografia.pdf');
  });
});

describe('users', () => {
  it('take the RGM from a student e-mail and invent none for the staff', () => {
    const student = { perfil: 'ALUNO', email: '11231101228@alunos.umc.br' } as User;
    const advisor = { perfil: 'ORIENTADOR', email: 'prof@umc.br' } as User;
    expect(rgmOf(student)).toBe('11231101228');
    expect(rgmOf(advisor)).toBe('');
    expect(rgmOf(null)).toBe('');
  });

  it('follow the Cognito password policy', () => {
    expect(PASSWORD_RULE.test('Teste12345678@')).toBe(true);
    for (const weak of ['curta1@A', 'semnumero@A', 'SEMMINUSCULA1@', 'semsimbolo1A']) {
      expect(PASSWORD_RULE.test(weak)).toBe(weak === 'curta1@A');
    }
  });
});
