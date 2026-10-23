import {
  REGRA_SENHA,
  colegasDoFormulario,
  ehArquivoGuardado,
  ehDoPeriodo,
  nomeDoArquivo,
  periodoAtual,
  problemaDoArquivo,
  rgmDoUsuario,
  rotuloTurma,
} from '.';
import type { Curso, Usuario } from '.';

const turma: Curso = { id: 't1', nome: 'Engenharia de Software', turno: 'NOITE', periodo: '2026.2' };

describe('turmas', () => {
  it('rotula com curso, turno e período', () => {
    expect(rotuloTurma(turma)).toBe('Engenharia de Software - Noite - 2026.2');
  });

  it('jan–jun é o semestre .1 e jul–dez o .2', () => {
    expect(periodoAtual(new Date(2026, 0, 10))).toBe('2026.1');
    expect(periodoAtual(new Date(2026, 5, 30))).toBe('2026.1');
    expect(periodoAtual(new Date(2026, 6, 1))).toBe('2026.2');
  });

  it('aceita as grafias antigas do período', () => {
    for (const p of ['2026.2', '2026/2', '2026-2', ' 2026.2 ']) {
      expect(ehDoPeriodo({ ...turma, periodo: p }, '2026.2')).toBe(true);
    }
    expect(ehDoPeriodo(turma, '2026.1')).toBe(false);
  });
});

describe('colegasDoFormulario', () => {
  it('separa por vírgula, espaço e quebra de linha, sem repetir nem incluir quem cria', () => {
    expect(colegasDoFormulario('111, 222;333\n222 999', '999')).toEqual({ rgms: ['111', '222', '333'] });
  });

  it('recusa RGM com letra', () => {
    expect(colegasDoFormulario('111, 12a', '999')).toEqual({
      erro: '"12a" não é um RGM válido — use só números.',
    });
  });

  it('recusa mais de 9 colegas (o grupo tem até 10 pessoas)', () => {
    const dez = Array.from({ length: 10 }, (_, i) => String(100 + i)).join(',');
    expect('erro' in colegasDoFormulario(dez, '999')).toBe(true);
  });
});

describe('arquivos', () => {
  const arquivo = (nome: string, tamanho: number) => new File([new Uint8Array(tamanho)], nome);

  it('aceita os tipos do backend, sem diferenciar maiúsculas', () => {
    expect(problemaDoArquivo(arquivo('Monografia.PDF', 10))).toBe('');
    expect(problemaDoArquivo(arquivo('slides.pptx', 10))).toBe('');
  });

  it('recusa tipo proibido, arquivo vazio e acima de 50 MB', () => {
    expect(problemaDoArquivo(arquivo('virus.exe', 10))).toContain('Tipo de arquivo não aceito');
    expect(problemaDoArquivo(arquivo('sem-extensao', 10))).toContain('Tipo de arquivo não aceito');
    expect(problemaDoArquivo(arquivo('vazio.pdf', 0))).toBe('O arquivo está vazio.');
    expect(problemaDoArquivo({ name: 'grande.pdf', size: 50 * 1024 * 1024 + 1 } as File)).toBe('O arquivo passa de 50 MB.');
  });

  it('mostra só o nome de um arquivo guardado e mantém o nome das entregas antigas', () => {
    const chave = 'entregas/p1/a1/c1/u1/Monografia Final.pdf';
    expect(ehArquivoGuardado(chave)).toBe(true);
    expect(nomeDoArquivo(chave)).toBe('Monografia Final.pdf');
    expect(ehArquivoGuardado('monografia.pdf')).toBe(false);
    expect(nomeDoArquivo('monografia.pdf')).toBe('monografia.pdf');
  });
});

describe('usuários', () => {
  it('tira o RGM do e-mail do aluno e não inventa RGM para a equipe', () => {
    const aluno = { perfil: 'ALUNO', email: '11231101228@alunos.umc.br' } as Usuario;
    const prof = { perfil: 'ORIENTADOR', email: 'prof@umc.br' } as Usuario;
    expect(rgmDoUsuario(aluno)).toBe('11231101228');
    expect(rgmDoUsuario(prof)).toBe('');
    expect(rgmDoUsuario(null)).toBe('');
  });

  it('segue a política de senha do Cognito', () => {
    expect(REGRA_SENHA.test('Teste12345678@')).toBe(true);
    for (const fraca of ['curta1@A', 'semnumero@A', 'SEMMINUSCULA1@', 'semsimbolo1A']) {
      expect(REGRA_SENHA.test(fraca)).toBe(fraca === 'curta1@A');
    }
  });
});
