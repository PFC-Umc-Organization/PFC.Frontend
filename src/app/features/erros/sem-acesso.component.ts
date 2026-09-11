import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconeComponent } from '../../shared/components/icone.component';

@Component({
  selector: 'app-sem-acesso',
  standalone: true,
  imports: [RouterLink, IconeComponent],
  template: `
    <div class="page">
      <section class="aviso">
        <app-icone nome="cadeado" class="aviso__icone" />
        <h1 class="page-title">Área restrita</h1>
        <p class="lead">
          Esta seção é exclusiva de professores e coordenadores. Se você
          acredita que deveria ter acesso, procure a coordenação do curso.
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
      --icone-size: 2.5rem;
      color: var(--bronze);
    }
  `,
})
export class SemAcessoComponent {}
