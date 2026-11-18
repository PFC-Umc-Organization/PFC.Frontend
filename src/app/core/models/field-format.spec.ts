import { extensionsOf, fileHintOf, formatLabel, linkProblem } from './field-format';
import { fileProblem } from './submission.model';

const file = (name: string, size = 10) => ({ name, size }) as File;

describe('file formats', () => {
  it('lists the accepted extensions and the hint of each format', () => {
    expect(extensionsOf('SLIDES')).toEqual(['.pptx', '.odp', '.pdf']);
    expect(fileHintOf('SLIDES')).toBe('Apenas PPTX, ODP ou PDF, até 50 MB');
    expect(fileHintOf(undefined)).toContain('Office/LibreOffice');
  });

  it('blocks files outside the field format', () => {
    expect(fileProblem(file('slides.pptx'), extensionsOf('SLIDES'))).toBe('');
    expect(fileProblem(file('monografia.docx'), extensionsOf('SLIDES'))).toContain('neste campo');
    expect(fileProblem(file('foto.png'))).toBe('');
  });

  it('names the format of a field', () => {
    expect(formatLabel('LINK', 'REPOSITORIO')).toContain('Repositório');
    expect(formatLabel('ARQUIVO', 'GERAL')).toBe('');
  });
});

describe('link validation', () => {
  it('requires a valid http or https address', () => {
    expect(linkProblem('', 'GERAL')).toBe('');
    expect(linkProblem('https://exemplo.com.br/doc', 'GERAL')).toBe('');
    expect(linkProblem('exemplo', 'GERAL')).not.toBe('');
    expect(linkProblem('ftp://exemplo.com', 'GERAL')).not.toBe('');
  });

  it('rejects link shorteners', () => {
    expect(linkProblem('https://bit.ly/abc', 'GERAL')).toContain('encurtados');
    expect(linkProblem('https://www.tinyurl.com/x', 'VIDEO')).toContain('encurtados');
  });

  it('requires user and repository on a repository link', () => {
    expect(linkProblem('https://github.com/aluno/pfc', 'REPOSITORIO')).toBe('');
    expect(linkProblem('https://github.com/aluno', 'REPOSITORIO')).toContain('usuario/repositorio');
    expect(linkProblem('https://exemplo.com/aluno/pfc', 'REPOSITORIO')).toContain('destino aceito');
  });

  it('accepts YouTube and Drive on a video link only', () => {
    expect(linkProblem('https://www.youtube.com/watch?v=abc', 'VIDEO')).toBe('');
    expect(linkProblem('https://youtu.be/abc', 'VIDEO')).toBe('');
    expect(linkProblem('https://drive.google.com/file/d/1/view', 'VIDEO')).toBe('');
    expect(linkProblem('https://github.com/aluno/pfc', 'VIDEO')).not.toBe('');
  });
});
