import { Component, Input, signal } from '@angular/core';
import { IconeComponent } from '../../shared/components/icone.component';

@Component({
  selector: 'app-auth-card',
  standalone: true,
  imports: [IconeComponent],
  template: `
    <main class="tela">
      <section class="cartao">
        <div class="cartao__marca">
          <span class="cartao__selo">
            <app-icone nome="capelo" class="cartao__icone" />
          </span>
          <span class="cartao__nome">Athena</span>
        </div>

        <h1 class="cartao__titulo">{{ titulo }}</h1>
        @if (subtitulo) {
          <p class="cartao__subtitulo">{{ subtitulo }}</p>
        }

        <ng-content />
      </section>

      <footer class="rodape">
        <span>Athena — O Portal do PFC</span>
        <span class="rodape__sep" aria-hidden="true">·</span>
        <span>Projeto Final de Curso</span>
        <span class="rodape__sep" aria-hidden="true">·</span>
        <a href="#" (click)="abrirPolitica($event)" class="rodape__link">
          Política de Privacidade
        </a>
      </footer>
    </main>

    <!-- Modal da Política de Privacidade -->
    @if (exibirModal()) {
      <div class="modal-overlay" (click)="fecharPolitica()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h2>Política de Privacidade — Athena</h2>
            <p>Versão 1.0 — Projeto Final de Curso (UMC)</p>
          </header>
          
          <div class="modal-body">
            <h3>1. Sobre a Plataforma</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>

            <h3>2. Coleta de Dados e Finalidades</h3>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit:</p>
            <ul>
              <li><strong>E-mail e Senha:</strong> Lorem ipsum dolor sit amet, consectetur adipiscing elit.</li>
              <li><strong>Dados Cadastrais:</strong> Sed do eiusmod tempor incididunt ut labore et dolore.</li>
              <li><strong>Logs do Sistema:</strong> Ut enim ad minim veniam, quis nostrud exercitation.</li>
            </ul>

            <h3>3. Armazenamento e Infraestrutura</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.
            </p>

            <h3>4. Direitos dos Titulares</h3>
            <p>
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn-fechar" (click)="fecharPolitica()">
              Fechar
            </button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: `
    .tela {
      min-height: 100vh;
      background: var(--background);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      padding: 1.5rem 1rem;
    }

    .cartao {
      width: 100%;
      max-width: 27.5rem;
      background: var(--card);
      border: 1px solid var(--border);
      box-shadow: 0 2px 6px oklch(22% 0.04 260 / 0.08);
      padding: 2.75rem 2.5rem;
    }

    @media (max-width: 480px) {
      .cartao {
        padding: 2rem 1.5rem;
        border: none;
        box-shadow: none;
      }
    }

    /* ---------------------------- marca ---------------------------- */
    .cartao__marca {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      margin-bottom: 2rem;
    }

    .cartao__selo {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      background: var(--primary);
      color: var(--primary-foreground);
    }

    .cartao__icone {
      --icone-size: 1.125rem;
    }

    .cartao__nome {
      font-family: var(--font-display);
      font-size: 1.0625rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: var(--primary);
    }

    /* --------------------------- títulos --------------------------- */
    .cartao__titulo {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--foreground);
      font-family: var(--font-sans);
      letter-spacing: -0.01em;
    }

    .cartao__subtitulo {
      margin-top: 0.5rem;
      font-size: 0.9375rem;
      color: var(--muted-foreground);
    }

    /* --------------------------- rodapé --------------------------- */
    .rodape {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: var(--muted-foreground);
      flex-wrap: wrap;
      justify-content: center;
    }

    .rodape__sep {
      opacity: 0.6;
    }

    .rodape__link {
      color: var(--primary);
      text-decoration: underline;
      cursor: pointer;
      font-weight: 500;
    }

    /* --------------------------- modal --------------------------- */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-card {
      background: var(--card, #ffffff);
      color: var(--foreground, #333333);
      border: 1px solid var(--border, #cccccc);
      border-radius: 8px;
      max-width: 600px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border, #eeeeee);
    }

    .modal-header h2 {
      font-size: 1.25rem;
      margin: 0;
      color: var(--primary, #1a365d);
    }

    .modal-header p {
      font-size: 0.75rem;
      color: var(--muted-foreground, #666666);
      margin: 0.25rem 0 0 0;
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      font-size: 0.875rem;
      line-height: 1.6;
    }

    .modal-body h3 {
      font-size: 1rem;
      margin: 1rem 0 0.25rem 0;
      color: var(--primary, #1a365d);
    }

    .modal-body h3:first-child {
      margin-top: 0;
    }

    .modal-body p {
      margin: 0 0 0.5rem 0;
    }

    .modal-body ul {
      margin: 0 0 0.5rem 0;
      padding-left: 1.25rem;
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border, #eeeeee);
      display: flex;
      justify-content: flex-end;
    }

    .btn-fechar {
      background: var(--primary, #1a365d);
      color: var(--primary-foreground, #ffffff);
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.875rem;
    }
  `,
})
export class AuthCardComponent {
  @Input({ required: true }) titulo!: string;
  @Input() subtitulo = '';

  readonly exibirModal = signal(false);

  abrirPolitica(event: Event): void {
    event.preventDefault();
    this.exibirModal.set(true);
  }

  fecharPolitica(): void {
    this.exibirModal.set(false);
  }
}