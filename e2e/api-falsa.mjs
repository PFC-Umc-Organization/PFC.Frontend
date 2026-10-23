// API e bucket falsos, com o formato e as regras do backend, servidos pelo
// roteamento do Playwright: os testes não dependem da AWS.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export const token = (claims) => `${b64({ alg: 'none' })}.${b64({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 })}.x`;
export function apiFalsa() {
  const db = {
    users: {
      'leonardoalvino@umc.br': { id: 'u-admin', nome: 'Leonardo Alvino', email: 'leonardoalvino@umc.br', perfil: 'ADMIN', senha: 'Teste12345678@' },
      '11231101228@alunos.umc.br': { id: 'u-aluno', nome: 'André Novaes', email: '11231101228@alunos.umc.br', perfil: 'ALUNO', rgm: '11231101228', senha: 'Teste12345678@' },
      'prof@umc.br': { id: 'u-prof', nome: 'Prof. Novo', email: 'prof@umc.br', perfil: 'ORIENTADOR', senha: 'Temp#1234', temporaria: true },
      'ana@umc.br': { id: 'u-ana', nome: 'Orientadora Ana', email: 'ana@umc.br', perfil: 'ORIENTADOR', senha: 'Teste12345678@' },
      '11231101229@alunos.umc.br': { id: 'u-bia', nome: 'Bia Lima', email: '11231101229@alunos.umc.br', perfil: 'ALUNO', rgm: '11231101229', senha: 'Teste12345678@' },
    },
    matriculas: { '11231101228': 't1', '11231101229': 't1', '11231101230': 't1' },
    cursos: [{ id: 'k1', nome: 'Engenharia de Software' }, { id: 'k2', nome: 'Sistemas de Informação' }],
    turmas: [
      { id: 't3', graduacaoId: 'k1', nome: 'Engenharia de Software', turno: 'MANHA', periodo: '2026.1' },
      { id: 't1', graduacaoId: 'k1', nome: 'Engenharia de Software', turno: 'NOITE', periodo: '2026.2' },
      { id: 't2', graduacaoId: 'k2', nome: 'Sistemas de Informação', turno: 'MANHA', periodo: '2026.2' },
    ],
    programas: [{ id: 'p1', cursoId: 't1' }, { id: 'p-orfao', cursoId: 'c-eng-noite' }],
    projetos: [
      { id: 'pr1', nome: 'Athena', descricao: 'Portal do PFC', programaId: 'p1', integrantes: ['11231101229', '11231101230'], orientadorId: 'u-ana' },
      { id: 'pr2', nome: 'Web-Cursos', descricao: 'Cursos online', programaId: 'p1', integrantes: [] },
    ],
    materiais: [
      { id: 'm1', titulo: 'Manual do PFC', descricao: 'Regras gerais', tipo: 'DOCUMENTO', url: 'https://umc.br/manual.pdf', cursoId: null, publicadoEm: '2026-10-01T12:00:00Z', publicadoPor: 'Leonardo Alvino', autorId: 'u-admin' },
      { id: 'm2', titulo: 'Aula da turma t2', descricao: '', tipo: 'VIDEO', url: 'https://youtu.be/x', cursoId: 't2', publicadoEm: '2026-10-02T12:00:00Z', publicadoPor: 'Orientadora Ana', autorId: 'u-ana' },
    ],
    entregas: [{ atividadeId: 'a1', projetoId: 'pr1', entregueEm: '2026-10-09T12:00:00Z', entreguePor: 'Bia Lima', respostas: { c1: 'monografia.pdf' } }],
    atividades: [
      { id: 'a1', titulo: 'Monografia', descricao: '', prazo: '2026-10-10T23:59', publicadaEm: '2026-10-01T00:00:00Z', campos: [{ id: 'c1', rotulo: 'Arquivo', tipo: 'ARQUIVO', obrigatorio: true }] },
      { id: 'a3', titulo: 'Monografia final', descricao: '', prazo: '2099-12-01T23:59', publicadaEm: '2026-10-01T00:00:00Z', campos: [{ id: 'c3', rotulo: 'Arquivo da entrega', tipo: 'ARQUIVO', obrigatorio: true }] },
      { id: 'a2', titulo: '1º CRUD', descricao: '', prazo: '2099-11-19T20:55', publicadaEm: '2026-10-01T00:00:00Z', campos: [{ id: 'c2', rotulo: 'Link do git', tipo: 'LINK', obrigatorio: true }] },
    ],
  };
  const calls = [];
  const failed = [];
  const sessao = (u) => ({ usuario: { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, status: 'ATIVO', cursoIds: u.rgm && db.matriculas[u.rgm] ? [db.matriculas[u.rgm]] : [], rgm: u.rgm }, token: token({ sub: u.id, email: u.email, name: u.nome, 'custom:perfil': u.perfil }) });
  const who = (req) => { try { return JSON.parse(Buffer.from(req.headers()['authorization'].split('.')[1], 'base64url')); } catch { return null; } };
  async function handle(route) {
    const req = route.request(); const url = new URL(req.url()); const p = url.pathname; const m = req.method();
    const body = req.postDataJSON?.() ?? null; const me = who(req);
    calls.push(`${m} ${p}`);
    const json = (status, data) => (status >= 400 && failed.push(`${status} ${m} ${p}`), route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) }));
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (p === '/auth/login') {
      const u = db.users[body.email.trim().toLowerCase()];
      if (!u || u.senha !== body.senha) return json(401, { erro: 'e-mail ou senha inválidos' });
      if (u.temporaria) return json(200, { desafio: 'NOVA_SENHA', sessao: 'sess-' + u.id });
      return json(200, sessao(u));
    }
    if (p === '/auth/nova-senha') {
      const u = db.users[body.email];
      if (!u || body.sessao !== 'sess-' + u.id) return json(401, { erro: 'a troca de senha expirou — entre de novo com a senha temporária do e-mail' });
      u.senha = body.senha; u.temporaria = false; return json(200, sessao(u));
    }
    if (p === '/auth/esqueci-senha') return json(200, { mensagem: 'se houver uma conta com esse e-mail, enviamos um código para redefinir a senha' });
    if (p === '/auth/redefinir-senha') {
      if (body.codigo !== '123456') return json(400, { erro: 'código incorreto — confira o e-mail e tente de novo' });
      const u = db.users[body.email]; if (u) u.senha = body.senha;
      return json(200, { mensagem: 'senha alterada — você já pode entrar' });
    }
    if (!me) return json(401, { message: 'Unauthorized' });
    const perfil = me['custom:perfil'];
    const staff = perfil !== 'ALUNO';
    const rgm = me.email.split('@')[0];
    const pode = (pr) => perfil === 'ADMIN' || (perfil === 'ORIENTADOR' && pr.orientadorId === me.sub) || (!staff && pr.integrantes.includes(rgm));
    const visiveis = (pid) => db.projetos.filter((x) => x.programaId === pid && (perfil === 'ADMIN' || x.orientadorId === me.sub));
    const turmaDe = (pid) => db.turmas.find((t) => t.id === db.programas.find((pg) => pg.id === pid)?.cursoId) ?? null;
    const nomeDe = (r) => Object.values(db.users).find((u) => u.rgm === r)?.nome ?? null;
    const detalhe = (pr) => ({ projeto: pr, integrantes: pr.integrantes.map((r) => ({ rgm: r, nome: nomeDe(r) })), orientador: pr.orientadorId ? { id: pr.orientadorId, nome: Object.values(db.users).find((u) => u.id === pr.orientadorId)?.nome ?? '' } : null, turma: turmaDe(pr.programaId) });
    const proibido = () => json(403, { erro: 'acesso restrito à equipe acadêmica' });
    if (p === '/me') return json(200, sessao(db.users[me.email]).usuario);
    if (p === '/turmas' && m === 'GET') return json(200, db.turmas);
    if (p === '/turmas' && m === 'POST') {
      if (!/^\d{4}[./-][12]$/.test(body.periodo.trim())) return json(400, { erro: 'período inválido — use ano e semestre, como 2026.2' });
      return json(201, { id: 't9', ...body });
    }
    let mm;
    if (p === '/cursos') return json(200, db.cursos);
    if (p === '/materiais' && m === 'GET') {
      const turma = db.matriculas[rgm];
      return json(200, db.materiais.filter((x) => staff || !x.cursoId || x.cursoId === turma).sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm)));
    }
    if (p === '/materiais' && m === 'POST') {
      if (!staff) return proibido();
      if (!body.url === !body.arquivo) return json(400, { erro: 'informe um link ou envie um arquivo' });
      const novo = { id: 'm' + (db.materiais.length + 1), titulo: body.titulo, descricao: body.descricao, tipo: body.tipo, url: body.url, arquivo: body.arquivo?.split('/').pop(), chave: body.arquivo, cursoId: body.cursoId, publicadoEm: new Date().toISOString(), publicadoPor: me.name, autorId: me.sub };
      db.materiais.push(novo);
      return json(201, novo);
    }
    if (p === '/materiais/arquivos') {
      if (!staff) return proibido();
      const chave = `materiais/u1/${body.nome}`;
      return json(201, { url: 'https://bucket-falso.s3.us-east-1.amazonaws.com', campos: { key: chave, 'Content-Type': 'application/pdf', policy: 'p', 'X-Amz-Signature': 's' }, chave, tamanhoMaximo: 52428800 });
    }
    if ((mm = p.match(/^\/materiais\/([^/]+)\/arquivo$/))) {
      const x = db.materiais.find((y) => y.id === mm[1]);
      return x?.chave ? json(200, { url: 'https://bucket-falso.s3.us-east-1.amazonaws.com/' + x.chave, nome: x.arquivo }) : json(404, { erro: 'este material não tem arquivo' });
    }
    if ((mm = p.match(/^\/materiais\/([^/]+)$/)) && m === 'DELETE') {
      const x = db.materiais.find((y) => y.id === mm[1]);
      if (!x) return json(404, { erro: 'material não encontrado' });
      if (perfil !== 'ADMIN' && x.autorId !== me.sub) return json(403, { erro: 'o orientador só remove os materiais que publicou' });
      db.materiais = db.materiais.filter((y) => y !== x);
      return json(200, { mensagem: 'material removido' });
    }
    if (p === '/programas') return json(200, db.programas);
    if ((mm = p.match(/^\/programas\/([^/]+)\/projetos$/))) return staff ? json(200, visiveis(mm[1])) : proibido();
    if ((mm = p.match(/^\/programas\/([^/]+)\/entregas$/))) {
      if (!staff) return proibido();
      const ids = visiveis(mm[1]).map((x) => x.id);
      return json(200, db.entregas.filter((e) => ids.includes(e.projetoId)));
    }
    if (p === '/meu-pfc' && m === 'GET') {
      if (staff) return json(403, { erro: 'esta rota é para alunos' });
      const pr = db.projetos.find((x) => x.integrantes.includes(rgm));
      if (pr) return json(200, { turma: turmaDe(pr.programaId), programaId: pr.programaId, grupo: detalhe(pr) });
      const turma = db.turmas.find((t) => t.id === db.matriculas[rgm]) ?? null;
      return json(200, { turma, programaId: db.programas.find((pg) => pg.cursoId === turma?.id)?.id, grupo: null });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)$/)) && m === 'GET') {
      const pr = db.projetos.find((x) => x.id === mm[1]);
      if (!pr) return json(404, { erro: 'projeto não encontrado' });
      return pode(pr) ? json(200, detalhe(pr)) : json(403, { erro: 'acesso restrito aos integrantes, ao orientador do projeto e à coordenação' });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/convites$/))) return json(200, []);
    if (p === '/atividades') return json(200, db.atividades);
    if ((mm = p.match(/^\/atividades\/([^/]+)\/entregas$/))) return perfil === 'ADMIN' ? json(200, []) : json(403, { erro: 'acesso restrito a administradores' });
    if ((mm = p.match(/^\/projetos\/([^/]+)\/entregas\/([^/]+)\/arquivos$/)) && m === 'POST') {
      const pr = db.projetos.find((x) => x.id === mm[1]);
      if (!pr || staff || !pr.integrantes.includes(rgm)) return json(403, { erro: 'apenas integrantes do projeto podem entregar' });
      const chave = `entregas/${mm[1]}/${mm[2]}/${body.campoId}/u1/${body.nome}`;
      return json(201, { url: 'https://bucket-falso.s3.us-east-1.amazonaws.com', campos: { key: chave, 'Content-Type': 'application/pdf', policy: 'p', 'X-Amz-Signature': 's' }, chave, tamanhoMaximo: 52428800 });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/entregas\/([^/]+)\/arquivos\/([^/]+)$/))) {
      const e = db.entregas.find((x) => x.projetoId === mm[1] && x.atividadeId === mm[2]);
      const v = e?.respostas?.[mm[3]];
      if (!v?.startsWith('entregas/')) return json(404, { erro: 'esta entrega não tem arquivo para baixar' });
      return json(200, { url: 'https://bucket-falso.s3.us-east-1.amazonaws.com/' + v, nome: v.split('/').pop() });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/entregas\/([^/]+)$/)) && m === 'PUT') {
      const antes = db.entregas.find((x) => x.projetoId === mm[1] && x.atividadeId === mm[2]);
      const atividade = db.atividades.find((a) => a.id === mm[2]);
      if (!antes && new Date(atividade.prazo) < new Date()) return json(409, { erro: 'o prazo desta atividade acabou: só quem entregou no prazo pode editar a entrega' });
      const agora = new Date().toISOString();
      const e = antes
        ? { ...antes, atualizadaEm: agora, atualizadaPor: me.name, respostas: body.respostas }
        : { atividadeId: mm[2], projetoId: mm[1], entregueEm: agora, entreguePor: me.name, respostas: body.respostas };
      db.entregas = db.entregas.filter((x) => x !== antes).concat(e);
      return json(200, e);
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/entregas$/))) {
      const pr = db.projetos.find((x) => x.id === mm[1]);
      return pr && pode(pr) ? json(200, db.entregas.filter((e) => e.projetoId === pr.id)) : json(403, { erro: 'acesso restrito' });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/referencias$/))) return json(200, []);
    if (p === '/meus-convites') return json(200, []);
    if (p === '/usuarios' && !staff) return proibido();
    if (p === '/usuarios') return json(200, Object.values(db.users).map((u) => ({ id: u.id, nome: u.nome, email: staff ? u.email : undefined, perfil: u.perfil, status: 'ATIVO', confirmado: !u.temporaria, cursoIds: [], rgm: u.rgm })));
    if (p === '/admin/students') return json(200, [{ rgm: '11231101228', status: 'ATIVO', turmaId: 't1' }, { rgm: '11231103420', status: 'ATIVO' }]);
    return json(404, { erro: 'rota não encontrada' });
  }
  const s3 = [];
  async function bucket(route) {
    const req = route.request();
    s3.push({ method: req.method(), auth: !!req.headers()['authorization'], url: req.url() });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST', 'access-control-allow-headers': '*' } });
    if (req.method() === 'POST') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
    return route.fulfill({ status: 200, contentType: 'application/pdf', headers: { 'content-disposition': 'attachment' }, body: '%PDF-1.4' });
  }
  return { db, calls, failed, handle, s3, bucket };
}
