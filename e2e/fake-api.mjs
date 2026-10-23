// A fake API and bucket with the backend's shapes and rules, served through
// Playwright's routing: the tests do not depend on AWS.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
export const token = (claims) => `${b64({ alg: 'none' })}.${b64({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 })}.x`;
export function fakeApi() {
  const db = {
    users: {
      'leonardoalvino@umc.br': { id: 'u-admin', nome: 'Leonardo Alvino', email: 'leonardoalvino@umc.br', perfil: 'ADMIN', senha: 'Teste12345678@' },
      '11231101228@alunos.umc.br': { id: 'u-aluno', nome: 'André Novaes', email: '11231101228@alunos.umc.br', perfil: 'ALUNO', rgm: '11231101228', senha: 'Teste12345678@' },
      'prof@umc.br': { id: 'u-prof', nome: 'Prof. Novo', email: 'prof@umc.br', perfil: 'ORIENTADOR', senha: 'Temp#1234', temporaria: true },
      'ana@umc.br': { id: 'u-ana', nome: 'Orientadora Ana', email: 'ana@umc.br', perfil: 'ORIENTADOR', senha: 'Teste12345678@' },
      '11231101229@alunos.umc.br': { id: 'u-bia', nome: 'Bia Lima', email: '11231101229@alunos.umc.br', perfil: 'ALUNO', rgm: '11231101229', senha: 'Teste12345678@' },
    },
    enrollments: { '11231101228': 't1', '11231101229': 't1', '11231101230': 't1' },
    courses: [{ id: 'k1', nome: 'Engenharia de Software' }, { id: 'k2', nome: 'Sistemas de Informação' }],
    cohorts: [
      { id: 't3', graduacaoId: 'k1', nome: 'Engenharia de Software', turno: 'MANHA', periodo: '2026.1' },
      { id: 't1', graduacaoId: 'k1', nome: 'Engenharia de Software', turno: 'NOITE', periodo: '2026.2' },
      { id: 't2', graduacaoId: 'k2', nome: 'Sistemas de Informação', turno: 'MANHA', periodo: '2026.2' },
    ],
    programs: [{ id: 'p1', cursoId: 't1' }, { id: 'p-orfao', cursoId: 'c-eng-noite' }],
    projects: [
      { id: 'pr1', nome: 'Athena', descricao: 'Portal do PFC', programaId: 'p1', integrantes: ['11231101229', '11231101230'], orientadorId: 'u-ana' },
      { id: 'pr2', nome: 'Web-Cursos', descricao: 'Cursos online', programaId: 'p1', integrantes: [] },
    ],
    materials: [
      { id: 'm1', titulo: 'Manual do PFC', descricao: 'Regras gerais', tipo: 'DOCUMENTO', url: 'https://umc.br/manual.pdf', cursoId: null, publicadoEm: '2026-10-01T12:00:00Z', publicadoPor: 'Leonardo Alvino', autorId: 'u-admin' },
      { id: 'm2', titulo: 'Aula da turma t2', descricao: '', tipo: 'VIDEO', url: 'https://youtu.be/x', cursoId: 't2', publicadoEm: '2026-10-02T12:00:00Z', publicadoPor: 'Orientadora Ana', autorId: 'u-ana' },
    ],
    references: [],
    submissions: [{ atividadeId: 'a1', projetoId: 'pr1', entregueEm: '2026-10-09T12:00:00Z', entreguePor: 'Bia Lima', respostas: { c1: 'monografia.pdf' } }],
    activities: [
      { id: 'a1', titulo: 'Monografia', descricao: '', prazo: '2026-10-10T23:59', publicadaEm: '2026-10-01T00:00:00Z', campos: [{ id: 'c1', rotulo: 'Arquivo', tipo: 'ARQUIVO', obrigatorio: true }] },
      { id: 'a3', titulo: 'Monografia final', descricao: '', prazo: '2099-12-01T23:59', publicadaEm: '2026-10-01T00:00:00Z', campos: [{ id: 'c3', rotulo: 'Arquivo da entrega', tipo: 'ARQUIVO', obrigatorio: true }] },
      { id: 'a2', titulo: '1º CRUD', descricao: '', prazo: '2099-11-19T20:55', publicadaEm: '2026-10-01T00:00:00Z', campos: [{ id: 'c2', rotulo: 'Link do git', tipo: 'LINK', obrigatorio: true }] },
    ],
  };
  const calls = [];
  const failed = [];
  const session = (u) => ({ usuario: { id: u.id, nome: u.nome, email: u.email, perfil: u.perfil, status: 'ATIVO', cursoIds: u.rgm && db.enrollments[u.rgm] ? [db.enrollments[u.rgm]] : [], rgm: u.rgm }, token: token({ sub: u.id, email: u.email, name: u.nome, 'custom:perfil': u.perfil }) });
  const who = (req) => { try { return JSON.parse(Buffer.from(req.headers()['authorization'].split('.')[1], 'base64url')); } catch { return null; } };
  async function handle(route) {
    const req = route.request(); const url = new URL(req.url()); const p = url.pathname; const m = req.method();
    const body = req.postDataJSON?.() ?? null; const me = who(req);
    calls.push(`${m} ${p}`);
    const json = (status, data) => (status >= 400 && failed.push(`${status} ${m} ${p}`), route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(data) }));
    if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (p === '/auth/login') {
      const u = db.users[body.email.trim().toLowerCase()];
      if (!u || u.senha !== body.senha) return json(401, { erro: 'E-mail ou senha inválidos' });
      if (u.temporaria) return json(200, { desafio: 'NOVA_SENHA', sessao: 'sess-' + u.id });
      return json(200, session(u));
    }
    if (p === '/auth/nova-senha') {
      const u = db.users[body.email];
      if (!u || body.sessao !== 'sess-' + u.id) return json(401, { erro: 'A troca de senha expirou. Entre de novo com a senha temporária do e-mail' });
      u.senha = body.senha; u.temporaria = false; return json(200, session(u));
    }
    if (p === '/auth/esqueci-senha') return json(200, { mensagem: 'Se houver uma conta com esse e-mail, enviamos um código para redefinir a senha' });
    if (p === '/auth/redefinir-senha') {
      if (body.codigo !== '123456') return json(400, { erro: 'Código incorreto. Confira o e-mail e tente de novo' });
      const u = db.users[body.email]; if (u) u.senha = body.senha;
      return json(200, { mensagem: 'Senha alterada. Você já pode entrar' });
    }
    if (!me) return json(401, { message: 'Unauthorized' });
    const role = me['custom:perfil'];
    const staff = role !== 'ALUNO';
    const rgm = me.email.split('@')[0];
    const canView = (pr) => role === 'ADMIN' || (role === 'ORIENTADOR' && pr.orientadorId === me.sub) || (!staff && pr.integrantes.includes(rgm));
    const visible = (pid) => db.projects.filter((x) => x.programaId === pid && (role === 'ADMIN' || x.orientadorId === me.sub));
    const cohortOf = (pid) => db.cohorts.find((t) => t.id === db.programs.find((pg) => pg.id === pid)?.cursoId) ?? null;
    const nameOf = (r) => Object.values(db.users).find((u) => u.rgm === r)?.nome ?? null;
    const detail = (pr) => ({ projeto: pr, integrantes: pr.integrantes.map((r) => ({ rgm: r, nome: nameOf(r) })), orientador: pr.orientadorId ? { id: pr.orientadorId, nome: Object.values(db.users).find((u) => u.id === pr.orientadorId)?.nome ?? '' } : null, turma: cohortOf(pr.programaId) });
    const forbidden = () => json(403, { erro: 'Acesso restrito à equipe acadêmica' });
    if (p === '/me') return json(200, session(db.users[me.email]).usuario);
    if (p === '/turmas' && m === 'GET') return json(200, db.cohorts);
    if (p === '/turmas' && m === 'POST') {
      if (!/^\d{4}[./-][12]$/.test(body.periodo.trim())) return json(400, { erro: 'Período inválido. Use ano e semestre, como 2026.2' });
      const course = db.courses.find((c) => c.nome === body.nome);
      const t = { id: `t${db.cohorts.length + 10}`, graduacaoId: course?.id, ...body };
      db.cohorts.push(t);
      return json(201, t);
    }
    let mm;
    if (p === '/cursos' && m === 'POST') {
      const c = { id: `k${db.courses.length + 10}`, nome: body.nome.trim() };
      db.courses.push(c);
      return json(201, c);
    }
    if (p === '/cursos') return json(200, db.courses);
    if (p === '/materiais' && m === 'GET') {
      const cohortId = db.enrollments[rgm];
      return json(200, db.materials.filter((x) => staff || !x.cursoId || x.cursoId === cohortId).sort((a, b) => b.publicadoEm.localeCompare(a.publicadoEm)));
    }
    if (p === '/materiais' && m === 'POST') {
      if (!staff) return forbidden();
      if (!body.url === !body.arquivo) return json(400, { erro: 'Informe um link ou envie um arquivo' });
      const created = { id: 'm' + (db.materials.length + 1), titulo: body.titulo, descricao: body.descricao, tipo: body.tipo, url: body.url, arquivo: body.arquivo?.split('/').pop(), chave: body.arquivo, cursoId: body.cursoId, publicadoEm: new Date().toISOString(), publicadoPor: me.name, autorId: me.sub };
      db.materials.push(created);
      return json(201, created);
    }
    if (p === '/materiais/arquivos') {
      if (!staff) return forbidden();
      const key = `materiais/u1/${body.nome}`;
      return json(201, { url: 'https://fake-bucket.s3.us-east-1.amazonaws.com', campos: { key, 'Content-Type': 'application/pdf', policy: 'p', 'X-Amz-Signature': 's' }, chave: key, tamanhoMaximo: 52428800 });
    }
    if ((mm = p.match(/^\/materiais\/([^/]+)\/arquivo$/))) {
      const x = db.materials.find((y) => y.id === mm[1]);
      return x?.chave ? json(200, { url: 'https://fake-bucket.s3.us-east-1.amazonaws.com/' + x.chave, nome: x.arquivo }) : json(404, { erro: 'Este material não tem arquivo' });
    }
    if ((mm = p.match(/^\/materiais\/([^/]+)$/)) && m === 'DELETE') {
      const x = db.materials.find((y) => y.id === mm[1]);
      if (!x) return json(404, { erro: 'Material não encontrado' });
      if (role !== 'ADMIN' && x.autorId !== me.sub) return json(403, { erro: 'O orientador só remove os materiais que publicou' });
      db.materials = db.materials.filter((y) => y !== x);
      return json(200, { mensagem: 'Material removido' });
    }
    if (p === '/programas') return json(200, db.programs);
    if ((mm = p.match(/^\/programas\/([^/]+)\/projetos$/))) return staff ? json(200, visible(mm[1])) : forbidden();
    if ((mm = p.match(/^\/programas\/([^/]+)\/entregas$/))) {
      if (!staff) return forbidden();
      const ids = visible(mm[1]).map((x) => x.id);
      return json(200, db.submissions.filter((e) => ids.includes(e.projetoId)));
    }
    if (p === '/meu-pfc' && m === 'GET') {
      if (staff) return json(403, { erro: 'Esta rota é para alunos' });
      const pr = db.projects.find((x) => x.integrantes.includes(rgm));
      if (pr) return json(200, { turma: cohortOf(pr.programaId), programaId: pr.programaId, grupo: detail(pr) });
      const cohort = db.cohorts.find((t) => t.id === db.enrollments[rgm]) ?? null;
      return json(200, { turma: cohort, programaId: db.programs.find((pg) => pg.cursoId === cohort?.id)?.id, grupo: null });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)$/)) && m === 'GET') {
      const pr = db.projects.find((x) => x.id === mm[1]);
      if (!pr) return json(404, { erro: 'Projeto não encontrado' });
      return canView(pr) ? json(200, detail(pr)) : json(403, { erro: 'Acesso restrito aos integrantes, ao orientador do projeto e à coordenação' });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/convites$/)) && m === 'GET') {
      const invited = mm[1] === 'pr1' ? ['11231101228', '11231103420'] : [];
      return json(200, invited.map((r) => ({ projetoId: mm[1], projetoNome: 'Athena', rgm: r, nome: nameOf(r) ?? undefined, convidadoPor: 'Bia Lima', criadoEm: '2026-10-20T12:00:00Z' })));
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/convites$/))) return json(200, []);
    const activity = (id) => db.activities.find((x) => x.id === id);
    const project = (id) => db.projects.find((x) => x.id === id);
    if (p === '/atividades' && m === 'POST') {
      const a = { id: `a${db.activities.length + 10}`, titulo: body.titulo, descricao: body.descricao, prazo: body.prazo, publicadaEm: new Date().toISOString(), campos: (body.campos ?? []).map((c, i) => ({ id: `n${i}`, ...c })) };
      db.activities.push(a);
      return json(201, a);
    }
    if (p === '/atividades') return json(200, db.activities);
    if ((mm = p.match(/^\/atividades\/([^/]+)$/)) && m === 'PUT') return json(200, Object.assign(activity(mm[1]), body));
    if ((mm = p.match(/^\/atividades\/([^/]+)\/campos$/)) && m === 'POST') {
      const c = { id: `f${Date.now()}`, ...body };
      activity(mm[1]).campos.push(c);
      return json(201, c);
    }
    if ((mm = p.match(/^\/atividades\/([^/]+)\/campos\/([^/]+)$/)) && m === 'DELETE') {
      const a = activity(mm[1]);
      if (a.campos.length <= 1) return json(409, { erro: 'A atividade precisa de ao menos um campo de entrega' });
      a.campos = a.campos.filter((c) => c.id !== mm[2]);
      return json(200, {});
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/orientador$/))) {
      project(mm[1]).orientadorId = m === 'PUT' ? body.orientadorId : undefined;
      return json(200, {});
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)$/)) && m === 'PUT') {
      Object.assign(project(mm[1]), body);
      return json(200, {});
    }
    if ((mm = p.match(/^\/atividades\/([^/]+)\/entregas$/))) return role === 'ADMIN' ? json(200, []) : json(403, { erro: 'Acesso restrito a administradores' });
    if ((mm = p.match(/^\/projetos\/([^/]+)\/entregas\/([^/]+)\/arquivos$/)) && m === 'POST') {
      const pr = db.projects.find((x) => x.id === mm[1]);
      if (!pr || staff || !pr.integrantes.includes(rgm)) return json(403, { erro: 'Apenas integrantes do projeto podem entregar' });
      const key = `entregas/${mm[1]}/${mm[2]}/${body.campoId}/u1/${body.nome}`;
      return json(201, { url: 'https://fake-bucket.s3.us-east-1.amazonaws.com', campos: { key, 'Content-Type': 'application/pdf', policy: 'p', 'X-Amz-Signature': 's' }, chave: key, tamanhoMaximo: 52428800 });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/entregas\/([^/]+)\/arquivos\/([^/]+)$/))) {
      const e = db.submissions.find((x) => x.projetoId === mm[1] && x.atividadeId === mm[2]);
      const v = e?.respostas?.[mm[3]];
      if (!v?.startsWith('entregas/')) return json(404, { erro: 'Esta entrega não tem arquivo para baixar' });
      return json(200, { url: 'https://fake-bucket.s3.us-east-1.amazonaws.com/' + v, nome: v.split('/').pop() });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/entregas\/([^/]+)$/)) && m === 'PUT') {
      const previous = db.submissions.find((x) => x.projetoId === mm[1] && x.atividadeId === mm[2]);
      const due = db.activities.find((a) => a.id === mm[2]).prazo;
      if (!previous && new Date(due) < new Date()) return json(409, { erro: 'O prazo desta atividade acabou e ela não recebe mais entregas' });
      const now = new Date().toISOString();
      const e = previous
        ? { ...previous, atualizadaEm: now, atualizadaPor: me.name, respostas: body.respostas }
        : { atividadeId: mm[2], projetoId: mm[1], entregueEm: now, entreguePor: me.name, respostas: body.respostas };
      db.submissions = db.submissions.filter((x) => x !== previous).concat(e);
      return json(200, e);
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/entregas$/))) {
      const pr = db.projects.find((x) => x.id === mm[1]);
      return pr && canView(pr) ? json(200, db.submissions.filter((e) => e.projetoId === pr.id)) : json(403, { erro: 'Acesso restrito' });
    }
    if (p === '/referencias/busca') {
      return json(200, { total: 2, pagina: 1, artigos: [
        { doi: '10.1/abc', titulo: 'Gestão de projetos ágeis', autores: ['SILVA, Ana'], ano: 2024, veiculo: 'Revista X', citacoes: 3 },
        { titulo: 'Sem DOI', autores: [], citacoes: 0 },
      ] });
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/referencias$/)) && m === 'POST') {
      const r = { id: `r${db.references.length + 1}`, projetoId: mm[1], doi: body.doi, titulo: 'Gestão de projetos ágeis', abnt: 'SILVA, Ana. Gestão de projetos ágeis. 2024.', abntHtml: 'SILVA, Ana. <strong>Gestão de projetos ágeis</strong>. 2024.', adicionadaPor: me.name, adicionadaEm: new Date().toISOString() };
      db.references.push(r);
      return json(201, r);
    }
    if ((mm = p.match(/^\/projetos\/([^/]+)\/referencias$/))) return json(200, db.references.filter((r) => r.projetoId === mm[1]));
    if (p === '/meus-convites') return json(200, []);
    if (p === '/usuarios' && !staff) return forbidden();
    if (p === '/usuarios') return json(200, Object.values(db.users).map((u) => ({ id: u.id, nome: u.nome, email: staff ? u.email : undefined, perfil: u.perfil, status: 'ATIVO', confirmado: !u.temporaria, cursoIds: [], rgm: u.rgm })));
    if (p === '/admin/students') return json(200, [{ rgm: '11231101228', status: 'ATIVO', turmaId: 't1' }, { rgm: '11231103420', status: 'ATIVO' }]);
    return json(404, { erro: 'Rota não encontrada' });
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
