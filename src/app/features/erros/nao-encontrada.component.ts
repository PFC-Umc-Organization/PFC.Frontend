import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconeComponent } from '../../shared/components/icone.component';

@Component({
  selector: 'app-nao-encontrada',
  standalone: true,
  imports: [RouterLink, IconeComponent],
  template: `
    <div class="page">
      <section class="aviso">
        <app-icone nome="templo" class="aviso__icone" />
        <h1 class="page-title">Página não encontrada</h1>
        <p class="lead">
          O endereço que você tentou abrir não existe no portal.
        </p>
        <a class="btn btn--primary mt-6" routerLink="/">Voltar ao início</a>
      </section>
    </div>
  `,
  styles: `
    .aviso {
      display: grid;
      justify-items: center;
      text-align: center;
      gap: 0.75rem;
      max-width: 32rem;
      margin-inline: auto;
      padding: 3.5rem 1.5rem;
      background: var(--card);
      border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent);
    }

    .aviso__icone {
      --icone-size: 3rem;
      color: color-mix(in oklch, var(--primary) 30%, transparent);
    }
  `,
})
export class NaoEncontradaComponent {}
