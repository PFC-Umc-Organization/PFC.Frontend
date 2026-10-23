import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { deduplicarInterceptor } from './deduplicar.interceptor';

describe('interceptors', () => {
  const api = environment.apiBaseUrl;
  let http: HttpClient;
  let backend: HttpTestingController;
  const auth = { token: signal<string | null>('token-do-aluno'), sair: vi.fn() };

  beforeEach(() => {
    auth.sair.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideHttpClient(withInterceptors([deduplicarInterceptor, authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('põe o Bearer nas chamadas protegidas da API', () => {
    http.get(`${api}/meu-pfc`).subscribe();
    const req = backend.expectOne(`${api}/meu-pfc`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-do-aluno');
    req.flush({});
  });

  it('não põe o Bearer nas rotas públicas', () => {
    http.post(`${api}/auth/login`, {}).subscribe();
    const req = backend.expectOne(`${api}/auth/login`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('não manda o token para o S3 (o upload assinado seria recusado)', () => {
    const bucket = 'https://umc-prd-uploads-x.s3.us-east-1.amazonaws.com';
    http.post(bucket, new FormData()).subscribe();
    const req = backend.expectOne(bucket);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('401 numa rota protegida encerra a sessão e volta ao login', () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.get(`${api}/meu-pfc`).subscribe({ error: () => undefined });
    backend.expectOne(`${api}/meu-pfc`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.sair).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(['/entrar']);
  });

  it('junta GETs iguais em voo numa requisição só', () => {
    const respostas: unknown[] = [];
    http.get(`${api}/turmas`).subscribe((r) => respostas.push(r));
    http.get(`${api}/turmas`).subscribe((r) => respostas.push(r));
    backend.expectOne(`${api}/turmas`).flush([{ id: 't1' }]);
    expect(respostas).toEqual([[{ id: 't1' }], [{ id: 't1' }]]);

    http.get(`${api}/turmas`).subscribe();
    backend.expectOne(`${api}/turmas`).flush([]);
  });
});
