import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Announcement } from '../models';
import { AnnouncementHttpService } from './announcement.service';

describe('AnnouncementHttpService', () => {
  it('reads the backend JSON (criadoEm, autorNome, no turmaId) newest first, even with a missing date', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), AnnouncementHttpService],
    });
    const service = TestBed.inject(AnnouncementHttpService);
    const http = TestBed.inject(HttpTestingController);

    const list = firstValueFrom(service.list());
    // As internal/announcements/domain.go sends it: a general announcement has no turmaId.
    http.expectOne(`${environment.apiBaseUrl}/avisos`).flush([
      { id: 'a1', titulo: 'Antigo', conteudo: '', autorId: 'u1', autorNome: 'Leonardo', criadoEm: '2026-11-01T10:00:00Z' },
      { id: 'a2', titulo: 'Sem data', conteudo: '', autorId: 'u1', autorNome: 'Leonardo' },
      { id: 'a3', titulo: 'Novo', conteudo: '', turmaId: 't1', autorId: 'u1', autorNome: 'Leonardo', criadoEm: '2026-11-18T10:00:00Z' },
    ]);

    const items: Announcement[] = await list;
    expect(items.map((a) => a.id)).toEqual(['a3', 'a1', 'a2']);
    expect(items[1].autorNome).toBe('Leonardo');
    http.verify();
  });
});
