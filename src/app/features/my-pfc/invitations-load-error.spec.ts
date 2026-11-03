import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

import { Invitation } from '../../core/models';
import { InvitationService } from '../../core/services/invitation.service';
import { ReceivedInvitationsComponent } from './received-invitations/received-invitations.component';
import { SentInvitationsComponent } from './sent-invitations/sent-invitations.component';

const invitation: Invitation = {
  projetoId: 'pr1',
  projetoNome: 'Athena',
  rgm: '222',
  convidadoPor: 'Ana',
  criadoEm: '2026-10-01T12:00:00Z',
};
const failure = () => throwError(() => new Error('serviço fora do ar'));

/** Fails on the first call and answers with the invitation on the retry. */
function failingOnce(): () => Observable<Invitation[]> {
  let calls = 0;
  return () => (++calls === 1 ? failure() : of([invitation]));
}

function configure(service: Partial<InvitationService>): void {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), { provide: InvitationService, useValue: service }],
  });
}

function retry(host: HTMLElement): void {
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent?.includes('Tentar novamente'));
  button!.click();
}

describe('ReceivedInvitationsComponent', () => {
  it('shows why loading failed and lets the student retry', async () => {
    configure({ mine: failingOnce() });
    const fixture = TestBed.createComponent(ReceivedInvitationsComponent);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Não foi possível carregar os convites recebidos. serviço fora do ar');

    retry(host);
    await fixture.whenStable();
    expect(host.textContent).not.toContain('Não foi possível');
    expect(host.textContent).toContain('Athena');
  });

  it('shows nothing when there are no invitations', async () => {
    configure({ mine: () => of([]) });
    const fixture = TestBed.createComponent(ReceivedInvitationsComponent);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });
});

describe('SentInvitationsComponent', () => {
  it('does not claim there are no invitations when loading failed, and lets the group retry', async () => {
    configure({ ofProject: failingOnce() });
    const fixture = TestBed.createComponent(SentInvitationsComponent);
    fixture.componentRef.setInput('projectId', 'pr1');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Não foi possível carregar os convites pendentes. serviço fora do ar');
    expect(host.textContent).not.toContain('Nenhum convite aguardando resposta');

    retry(host);
    await fixture.whenStable();
    expect(host.textContent).not.toContain('Não foi possível');
    expect(host.textContent).toContain('RGM 222');
  });

  it('says so when the group really has no pending invitations', async () => {
    configure({ ofProject: () => of([]) });
    const fixture = TestBed.createComponent(SentInvitationsComponent);
    fixture.componentRef.setInput('projectId', 'pr1');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Nenhum convite aguardando resposta');
  });
});
