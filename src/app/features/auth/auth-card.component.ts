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
          Política de Privacidade e Termos de Uso
        </a>
      </footer>
    </main>

    <!-- Modal da Política de Privacidade e Termos de Uso (LGPD v2.1) -->
    @if (exibirModal()) {
      <div class="modal-overlay" (click)="fecharPolitica()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h2>POLÍTICA DE PRIVACIDADE E TERMOS DE USO</h2>
            <p>Athena (PFC Manager) | Versão 2.1 (2026) — UMC</p>
          </header>
          
          <div class="modal-body">
            <h3>1. IDENTIFICAÇÃO DO CONTROLADOR E DO SISTEMA</h3>
            <p>
              O <strong>Athena (PFC Manager)</strong> é uma plataforma acadêmica desenvolvida para centralização, acompanhamento de cronogramas e gestão de entregas de Projetos de Final de Curso dos cursos de Bacharelado em Sistemas de Informação e Engenharia de Software da Universidade de Mogi das Cruzes (UMC)[cite: 2, 3]. Em uma implantação real em ambiente de produção, a instituição de ensino atua como Controladora dos dados pessoais[cite: 2].
            </p>

            <h4>1.1 Encarregado de Dados (DPO)</h4>
            <p>
              Nos termos do art. 41 da LGPD, o Athena disponibiliza um canal de contato para exercício de direitos e esclarecimento de dúvidas sobre tratamento de dados pessoais[cite: 2]:
            </p>
            <p><strong>Canal de contato do grupo responsável:</strong> pfc.srvlss@gmail.com</p>
            <p>
              Em caráter acadêmico, o encarregado é representado pelos integrantes do grupo de TCC responsáveis pelo desenvolvimento do sistema, sob supervisão do professor orientador[cite: 2, 3]. Em uma eventual implantação institucional real, a UMC deverá designar formalmente um Encarregado de Dados (DPO) próprio[cite: 2].
            </p>

            <h3>2. DADOS PESSOAIS TRATADOS E FINALIDADES CONCRETAS</h3>
            <p>Em conformidade com o princípio da minimização, o sistema trata apenas os dados estritamente necessários para a execução do fluxo acadêmico[cite: 2]:</p>
            <ul>
              <li><strong>RGM (Registro Geral de Matrícula):</strong> Utilizado na funcionalidade de pré-autorização de alunos e liberação do cadastro na plataforma (Base Legal: Execução de Contrato / Procedimentos Preliminares — Art. 7º, V, LGPD)[cite: 2, 3].</li>
              <li><strong>Nome Completo e E-mail Institucional:</strong> Utilizados para criação de conta, autenticação e identificação do usuário na interface (Base Legal: Execução de Contrato — Art. 7º, V, LGPD)[cite: 2, 3].</li>
              <li><strong>Senha de Acesso:</strong> Autenticação do usuário. É armazenada exclusivamente sob a forma de hash criptográfico pelo serviço AWS Cognito, não havendo armazenamento em texto puro (Base Legal: Execução de Contrato — Art. 7º, V, LGPD)[cite: 2, 3].</li>
              <li><strong>Vínculo de Grupos, Orientadores e Perfis:</strong> Associação de alunos a seus respectivos PFCs, definição de orientadores e gestão dos papéis de Aluno, Professor/Orientador e Banca (Base Legal: Execução de Contrato / Exercício Regular de Direitos — Art. 7º, V e VI, LGPD)[cite: 2, 3].</li>
              <li><strong>Trabalhos Acadêmicos, Relatórios em PDF e Timestamps:</strong> Submissão de arquivos do PFC, registro preciso do horário de envio para verificação de prazos do cronograma e cálculo automatizado de penalidades por atraso (Base Legal: Execução de Contrato / Exercício Regular de Direitos — Art. 7º, V e VI, LGPD)[cite: 2, 3].</li>
              <li><strong>Logs de Auditoria e Endereço IP:</strong> Registros de acesso e operações críticas gravados via AWS CloudWatch e AWS CloudTrail para fins de segurança e rastreabilidade de ações na infraestrutura (Base Legal: Cumprimento de Obrigação Legal — Art. 7º, II, LGPD)[cite: 2, 3].</li>
            </ul>

            <h3>3. COMPARTILHAMENTO E INFRAESTRUTURA EM NUVEM (AWS SERVERLESS)</h3>
            <p>
              Os dados pessoais não são comercializados ou compartilhados com terceiros não autorizados[cite: 2]. A infraestrutura opera integralmente sob arquitetura Serverless na Amazon Web Services (AWS)[cite: 3]:
            </p>
            <ul>
              <li><strong>Amazon S3 & AWS CloudFront:</strong> Hospedagem estática da interface web e armazenamento isolado de arquivos em PDF enviados pelos alunos[cite: 2, 3].</li>
              <li><strong>AWS Cognito & Active Directory:</strong> Autenticação de identidades, controle de sessões e verificação de perfil[cite: 3].</li>
              <li><strong>AWS WAF, API Gateway & AWS Lambda (Golang):</strong> Intermediação e processamento seguro das rotas de backend sob demanda[cite: 3].</li>
              <li><strong>Amazon DynamoDB:</strong> Persistência NoSQL de dados cadastrais, grupos, cronogramas e datas limite[cite: 3].</li>
              <li><strong>AWS Secrets Manager, CloudWatch & CloudTrail:</strong> Proteção de credenciais da infraestrutura, monitoramento de logs de segurança e registro de auditoria das ações realizadas no ambiente AWS, sem gravação de senhas ou dados sensíveis nos registros[cite: 2, 3].</li>
            </ul>

            <h4>3.1 Transferência Internacional de Dados</h4>
            <p>
              O ambiente de produção do Athena está hospedado na região <code>us-east-1</code> (Norte da Virgínia, Estados Unidos) da AWS[cite: 3]. Dessa forma, os dados pessoais tratados pela plataforma são armazenados e processados fora do território nacional, caracterizando transferência internacional de dados nos termos do art. 33 da LGPD[cite: 2].
            </p>
            <p>
              Essa transferência tem como base legal a necessidade de execução do contrato/serviço educacional (art. 33, II c/c art. 7º, V, LGPD), sendo a AWS uma provedora de nuvem que adota cláusulas contratuais e certificações internacionais de segurança e privacidade (incluindo conformidade com padrões como ISO 27001 e SOC 2)[cite: 2, 3]. Em uma implantação institucional definitiva, recomenda-se avaliar a migração para a região <code>sa-east-1</code> (São Paulo), de modo a manter os dados em território nacional e reduzir a complexidade regulatória[cite: 2].
            </p>

            <h4>3.2 Cookies e Tecnologias de Rastreamento</h4>
            <p>
              O Athena não utiliza cookies de rastreamento, publicidade ou opcionais[cite: 2]. São empregados apenas os cookies/tokens estritamente necessários ao funcionamento do serviço, relacionados à manutenção da sessão autenticada do usuário via AWS Cognito, sem finalidade de análise de comportamento ou perfilamento[cite: 2, 3]. Por não haver cookies opcionais, não é apresentado banner de consentimento de cookies na plataforma[cite: 2].
            </p>

            <h3>4. RETENÇÃO E DESCARTE DE DADOS</h3>
            <ul>
              <li><strong>Dados cadastrais e arquivos do PFC:</strong> Permanecem armazenados enquanto o vínculo acadêmico do aluno ou docente com o PFC estiver ativo, e por até 12 (doze) meses após a defesa/aprovação final do trabalho, prazo após o qual são submetidos a procedimentos técnicos de exclusão ou anonimização para fins estatísticos acadêmicos[cite: 2, 3].</li>
              <li><strong>Logs de auditoria e endereço IP:</strong> Mantidos pelo prazo de 6 (seis) meses, prazo compatível com boas práticas de segurança da informação, após o qual são descartados, salvo obrigação legal superveniente que determine prazo diverso[cite: 2].</li>
            </ul>
            <p>
              Ao final do ciclo acadêmico ou mediante solicitação justificada de encerramento, os arquivos gravados no Amazon S3 e as entradas no DynamoDB são submetidos aos mesmos procedimentos de exclusão ou anonimização[cite: 2, 3].
            </p>

            <h3>5. DIREITOS DOS TITULARES</h3>
            <p>
              O usuário pode exercer os direitos previstos no artigo 18 da LGPD (confirmação da existência de tratamento, acesso aos dados, correção de dados incompletos/inexatos, e solicitação de exclusão/anonimização), mediante solicitação enviada ao canal de contato indicado no item 1.1 desta política (pfc.srvlss@gmail.com)[cite: 2].
            </p>
            <p>
              As solicitações serão respondidas em prazo razoável, buscando-se atender em até 15 (quinze) dias corridos, conforme boas práticas recomendadas pela LGPD, podendo esse prazo ser prorrogado mediante justificativa[cite: 2].
            </p>

            <h3>6. SEGURANÇA DA INFORMAÇÃO E RESPOSTA A INCIDENTES</h3>
            <h4>6.1 Medidas de Segurança</h4>
            <p>
              O Athena adota medidas técnicas e organizacionais compatíveis com o porte acadêmico do projeto, entre elas: senhas armazenadas exclusivamente como hash criptográfico (AWS Cognito), tráfego criptografado via HTTPS, segregação de credenciais e segredos de infraestrutura em AWS Secrets Manager, controle de autorização por perfil validado no backend (Aluno, Professor/Orientador, Banca), e monitoramento de acessos e operações críticas via AWS CloudWatch e AWS CloudTrail[cite: 2, 3]. Detalhes técnicos adicionais de configuração de segurança não são divulgados nesta política, de modo a não facilitar tentativas de ataque[cite: 2].
            </p>

            <h4>6.2 Plano de Resposta a Incidentes</h4>
            <p>Em caso de incidente de segurança envolvendo dados pessoais, o grupo responsável pelo Athena seguirá o seguinte fluxo[cite: 2]:</p>
            <ol>
              <li>Detecção e confirmação do incidente a partir dos registros de auditoria (CloudWatch/CloudTrail) ou de notificação recebida[cite: 2, 3];</li>
              <li>Contenção do problema e preservação das evidências relevantes[cite: 2];</li>
              <li>Identificação dos dados pessoais e titulares potencialmente afetados[cite: 2];</li>
              <li>Avaliação de risco ou dano relevante aos titulares[cite: 2];</li>
              <li>Comunicação, quando aplicável, à Autoridade Nacional de Proteção de Dados (ANPD) e aos titulares afetados, em caso de risco ou dano relevante, nos termos do art. 48 da LGPD[cite: 2];</li>
              <li>Correção da causa, acompanhamento dos efeitos e registro das medidas adotadas para fins de aprendizado e melhoria contínua[cite: 2].</li>
            </ol>

            <h4>6.3 Versionamento da Política</h4>
            <p>
              Esta política é identificada por data de atualização e número de versão (indicados no cabeçalho deste documento)[cite: 2]. Alterações relevantes em seu conteúdo serão comunicadas aos usuários por meio da própria plataforma ou do e-mail institucional cadastrado[cite: 2].
            </p>

            <h3>7. TERMOS DE USO E CONDUTAS PROIBIDAS</h3>
            <p>É expressamente proibido[cite: 2]:</p>
            <ul>
              <li>Utilizar dados falsos de RGM ou e-mail para cadastro na plataforma[cite: 2, 3];</li>
              <li>Tentar burlar as rotas de perfil no backend ou acessar funcionalidades fora do papel (Aluno, Professor/Orientador, Banca) atribuído ao usuário[cite: 2, 3];</li>
              <li>Submeter arquivos maliciosos, corrompidos ou que não correspondam ao formato esperado (PDF)[cite: 2, 3];</li>
              <li>Tentar alterar, falsificar ou burlar os timestamps automatizados de entrega das atividades[cite: 2, 3].</li>
            </ul>

            <h4>7.1 Propriedade Intelectual</h4>
            <p>
              O código-fonte do Athena é disponibilizado publicamente em repositório no GitHub, sob licença de código aberto (open source), preservando-se a autoria dos desenvolvedores/alunos responsáveis pelo projeto[cite: 2, 3]. O repositório de infraestrutura permanece, até o momento, de caráter privado, podendo vir a se tornar público futuramente; independentemente de sua visibilidade, nenhum dado pessoal, credencial ou segredo de infraestrutura (chaves de acesso, senhas, variáveis sensíveis) deve constar em código-fonte versionado, público ou privado[cite: 2, 3].
            </p>
            <p>
              Os trabalhos acadêmicos (PFCs) submetidos por meio da plataforma têm sua autoria preservada em favor dos respectivos alunos, conforme legislação de direitos autorais, podendo a UMC utilizá-los para fins acadêmicos e de acervo institucional, nos termos do regulamento próprio da instituição[cite: 2, 3].
            </p>

            <h4>7.2 Limitação de Responsabilidade, Manutenção e Indisponibilidade</h4>
            <p>
              O Athena é uma ferramenta de apoio acadêmico desenvolvida em contexto de Projeto Final de Curso, não havendo garantia de disponibilidade contínua (24/7), tampouco responsabilidade por eventuais indisponibilidades, perdas de dados decorrentes de falhas de infraestrutura de terceiros (AWS) ou uso indevido da plataforma por parte dos usuários[cite: 2, 3]. O sistema poderá passar por períodos de manutenção programada ou indisponibilidade temporária decorrente de atualizações, correções ou falhas na infraestrutura de nuvem, sem que isso gere direito a indenização, sendo recomendável que os usuários não dependam exclusivamente da plataforma para cumprimento de prazos críticos sem margem de segurança[cite: 2, 3].
            </p>

            <h4>7.3 Requisitos de Acesso e Idade</h4>
            <p>
              O uso do Athena é destinado a alunos, professores/orientadores e membros de banca regularmente vinculados aos cursos de Bacharelado em Sistemas de Informação e Engenharia de Software da UMC, sendo o acesso concedido mediante vínculo institucional válido (matrícula ativa ou vínculo docente)[cite: 2, 3]. Por se tratar de plataforma de uso acadêmico voltada a estudantes de ensino superior, não é esperado o cadastro de menores de idade; caso isso ocorra excepcionalmente, aplicam-se as salvaguardas adicionais previstas na LGPD para o tratamento de dados de crianças e adolescentes[cite: 2].
            </p>

            <h4>7.4 Encerramento de Conta</h4>
            <p>
              O acesso do usuário à plataforma poderá ser encerrado: (i) automaticamente, ao término do vínculo acadêmico ou docente do usuário com a instituição; (ii) mediante solicitação do próprio usuário; ou (iii) por decisão da coordenação do curso, em caso de violação das condutas proibidas previstas nesta seção[cite: 2, 3]. O encerramento da conta segue o disposto na Seção 4 (Retenção e Descarte de Dados) desta política quanto ao destino dos dados armazenados[cite: 2].
            </p>

            <p style="font-size: 0.75rem; color: #777; margin-top: 1.5rem;">
              <em>Documento elaborado no âmbito de Projeto Final de Curso (TCC) da Universidade de Mogi das Cruzes (UMC)</em>[cite: 2, 3].
            </p>
          </div>

          <footer class="modal-footer">
            <button type="button" class="btn-fechar" (click)="fecharPolitica()">
              Entendi e Fechar
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
      max-width: 680px;
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
      font-size: 1.15rem;
      margin: 0;
      color: var(--primary, #1a365d);
      font-weight: 700;
    }

    .modal-header p {
      font-size: 0.75rem;
      color: var(--muted-foreground, #666666);
      margin: 0.25rem 0 0 0;
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      font-size: 0.85rem;
      line-height: 1.6;
    }

    .modal-body h3 {
      font-size: 0.95rem;
      margin: 1.25rem 0 0.35rem 0;
      color: var(--primary, #1a365d);
      font-weight: 700;
    }

    .modal-body h4 {
      font-size: 0.875rem;
      margin: 0.85rem 0 0.25rem 0;
      color: var(--foreground, #333333);
      font-weight: 700;
    }

    .modal-body h3:first-child {
      margin-top: 0;
    }

    .modal-body p {
      margin: 0 0 0.5rem 0;
      color: var(--foreground, #333333);
    }

    .modal-body ul, .modal-body ol {
      margin: 0 0 0.75rem 0;
      padding-left: 1.25rem;
    }

    .modal-body li {
      margin-bottom: 0.35rem;
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