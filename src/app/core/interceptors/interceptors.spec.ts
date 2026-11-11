import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { SKIP_DEDUPE, dedupeInterceptor, resetDedupe } from './dedupe.interceptor';

describe('interceptors', () => {
  const api = environment.apiBaseUrl;
  let http: HttpClient;
  let backend: HttpTestingController;
  const auth = { token: signal<string | null>('student-token'), signOut: vi.fn() };

  beforeEach(() => {
    resetDedupe();
    auth.signOut.mockReset();
    auth.token.set('student-token');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([dedupeInterceptor, authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('adds the Bearer token to protected API calls', () => {
    http.get(`${api}/meu-pfc`).subscribe();
    const req = backend.expectOne(`${api}/meu-pfc`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer student-token');
    req.flush({});
  });

  it('leaves public routes without the token', () => {
    http.post(`${api}/auth/login`, {}).subscribe();
    const req = backend.expectOne(`${api}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('only treats paths that start with /auth/ as public', () => {
    http.get(`${api}/referencias/busca?q=/auth/x`).subscribe();
    const req = backend.expectOne(`${api}/referencias/busca?q=/auth/x`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer student-token');
    req.flush({});
    http.get(`${api}/projetos/p1/auth/x`).subscribe();
    const deep = backend.expectOne(`${api}/projetos/p1/auth/x`);
    expect(deep.request.headers.get('Authorization')).toBe('Bearer student-token');
    deep.flush({});
  });

  it('never sends the token to S3, which would refuse the signed upload', () => {
    const bucket = 'https://umc-prd-uploads-x.s3.us-east-1.amazonaws.com';
    http.post(bucket, new FormData()).subscribe();
    const req = backend.expectOne(bucket);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('signs out and goes to the login on a 401, saying why and where to come back', () => {
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/entregaveis?atividade=a1');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    auth.signOut.mockImplementation(() => auth.token.set(null));
    http.get(`${api}/meu-pfc`).subscribe({ error: () => undefined });
    http.get(`${api}/atividades`).subscribe({ error: () => undefined });
    backend.expectOne(`${api}/meu-pfc`).flush({}, { status: 401, statusText: 'Unauthorized' });
    backend.expectOne(`${api}/atividades`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/entrar'], {
      queryParams: { motivo: 'sessao-expirada', retorno: '/entregaveis?atividade=a1' },
    });
  });

  it('joins identical GETs in flight into one request', () => {
    const responses: unknown[] = [];
    http.get(`${api}/turmas`).subscribe((r) => responses.push(r));
    http.get(`${api}/turmas`).subscribe((r) => responses.push(r));
    backend.expectOne(`${api}/turmas`).flush([{ id: 't1' }]);
    expect(responses).toEqual([[{ id: 't1' }], [{ id: 't1' }]]);

    http.get(`${api}/turmas`).subscribe();
    backend.expectOne(`${api}/turmas`).flush([]);
  });

  it('does not join GETs to the same URL with different response types', () => {
    http.get(`${api}/x`).subscribe();
    http.get(`${api}/x`, { responseType: 'text' }).subscribe();
    const reqs = backend.match(`${api}/x`);
    expect(reqs).toHaveLength(2);
    reqs.forEach((r) => r.flush(r.request.responseType === 'text' ? 'ok' : {}));
  });

  it('SKIP_DEDUPE sends its own request', () => {
    http.get(`${api}/y`).subscribe();
    http.get(`${api}/y`, { context: new HttpContext().set(SKIP_DEDUPE, true) }).subscribe();
    const reqs = backend.match(`${api}/y`);
    expect(reqs).toHaveLength(2);
    reqs.forEach((r) => r.flush({}));
  });

  it('drops the entry when the only subscriber unsubscribes', () => {
    http.get(`${api}/z`).subscribe().unsubscribe();
    http.get(`${api}/z`).subscribe();
    const reqs = backend.match(`${api}/z`);
    expect(reqs.filter((r) => !r.cancelled)).toHaveLength(1);
    reqs.filter((r) => !r.cancelled).forEach((r) => r.flush({}));
  });
});
