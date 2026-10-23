import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';
import { dedupeInterceptor } from './dedupe.interceptor';

describe('interceptors', () => {
  const api = environment.apiBaseUrl;
  let http: HttpClient;
  let backend: HttpTestingController;
  const auth = { token: signal<string | null>('student-token'), signOut: vi.fn() };

  beforeEach(() => {
    auth.signOut.mockReset();
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

  it('never sends the token to S3, which would refuse the signed upload', () => {
    const bucket = 'https://umc-prd-uploads-x.s3.us-east-1.amazonaws.com';
    http.post(bucket, new FormData()).subscribe();
    const req = backend.expectOne(bucket);
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('signs out and goes to the login on a 401', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.get(`${api}/meu-pfc`).subscribe({ error: () => undefined });
    backend.expectOne(`${api}/meu-pfc`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/entrar']);
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
});
