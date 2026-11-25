import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePageTitle } from '../app/context'
import logo from '../assets/logo.svg'
import { LEGAL } from '../lib/legal'

const SECTIONS = [
  { id: 'dados', title: 'Quais dados tratamos' },
  { id: 'finalidades', title: 'Para que usamos e com qual base legal' },
  { id: 'cookies', title: 'Cookies e armazenamento no navegador' },
  { id: 'seguranca', title: 'Como protegemos' },
  { id: 'retencao', title: 'Por quanto tempo guardamos' },
  { id: 'compartilhamento', title: 'Com quem compartilhamos' },
  { id: 'transferencia', title: 'Transferência internacional' },
  { id: 'direitos', title: 'Seus direitos' },
  { id: 'incidentes', title: 'Incidentes de segurança' },
  { id: 'alteracoes', title: 'Mudanças nesta política' },
  { id: 'contato', title: 'Contato do encarregado' },
]

// Public page (no session needed): LGPD art. 9 requires this information to be clear and easy to reach.
export default function Privacy() {
  usePageTitle('Política de privacidade')

  return (
    <div className="legal">
      <header className="legal-header">
        <Link to="/" className="brand">
          <img src={logo} alt="" width={32} height={32} />
          <span className="brand-text">
            <span className="brand-name">VaultShare</span>
            <span className="brand-tagline">ARQUIVOS SOB CONTROLE</span>
          </span>
        </Link>
        <Link to="/" className="button button-ghost">
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar
        </Link>
      </header>
      <main className="legal-body">
        <h1>Política de privacidade</h1>
        <p className="subtitle">Atualizada em {LEGAL.updatedAt}.</p>
        <p>
          Esta política explica, em linguagem direta, como o {LEGAL.controller} trata seus dados pessoais, conforme a
          Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD).
        </p>

        <nav className="legal-toc" aria-label="Nesta página">
          <ol>
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <section id="dados" aria-labelledby="dados-title">
          <h2 id="dados-title">Quais dados tratamos</h2>
          <ul>
            <li>
              <strong>Cadastro:</strong> nome, e-mail e plano. A senha nunca é guardada, só um resumo criptográfico
              (hash argon2id) que não permite recuperá-la.
            </li>
            <li>
              <strong>Arquivos:</strong> o conteúdo que você envia, o nome, o tipo, o tamanho e a data.
            </li>
            <li>
              <strong>Links de compartilhamento:</strong> arquivo, validade, número de acessos e, se houver senha, só o
              hash dela.
            </li>
            <li>
              <strong>Histórico de atividade:</strong> envios, criação de links e acessos aos seus arquivos, com o nome
              ou e-mail de quem acessou ou pediu acesso.
            </li>
            <li>
              <strong>Contatos:</strong> nome e e-mail das pessoas com quem você compartilha arquivos, usados só para a
              busca da sua conta.
            </li>
            <li>
              <strong>Sessões:</strong> data de início e de expiração de cada login. Guardamos só um resumo
              criptográfico do identificador da sessão.
            </li>
            <li>
              <strong>Registros técnicos:</strong> endereço IP, data e hora das requisições, usados para segurança.
            </li>
          </ul>
          <p>
            Não coletamos dados sensíveis de propósito nem tratamos dados para publicidade ou criação de perfil. O
            conteúdo dos arquivos é seu: só o tratamos para guardar e entregar a quem você compartilhar.
          </p>
          <p>
            Se você cadastrar dados de outras pessoas (contatos, destinatários de links ou arquivos com dados pessoais),
            é responsável por ter uma base legal para isso. Essas pessoas podem exercer os direitos delas pelo contato
            do encarregado.
          </p>
        </section>

        <section id="finalidades" aria-labelledby="finalidades-title">
          <h2 id="finalidades-title">Para que usamos e com qual base legal</h2>
          <ul>
            <li>
              <strong>Prestar o serviço</strong> (guardar, proteger e compartilhar seus arquivos): execução de contrato,
              art. 7º, V.
            </li>
            <li>
              <strong>Proteger sua conta</strong> (limitar tentativas de login, registrar acessos): legítimo interesse e
              prevenção à fraude, art. 7º, IX, e art. 11, II, g.
            </li>
            <li>
              <strong>Guardar registros de acesso</strong> pelo prazo exigido pelo Marco Civil da Internet: cumprimento
              de obrigação legal, art. 7º, II.
            </li>
            <li>
              <strong>Avisar sobre acessos aos seus arquivos</strong>, quando você liga essa opção: execução de
              contrato, art. 7º, V.
            </li>
          </ul>
        </section>

        <section id="cookies" aria-labelledby="cookies-title">
          <h2 id="cookies-title">Cookies e armazenamento no navegador</h2>
          <p>
            Usamos <strong>um único cookie, essencial</strong>, que mantém você conectado. Ele não pode ser lido por
            scripts da página, só é enviado ao próprio VaultShare e expira em até 7 dias. Por ser necessário ao
            funcionamento, não depende de consentimento.
          </p>
          <p>
            Suas preferências de aparência e acessibilidade (tema, animações e tamanho do texto) ficam salvas só neste
            navegador e nunca são enviadas para nós. Não usamos cookies de terceiros, ferramentas de análise nem
            publicidade.
          </p>
        </section>

        <section id="seguranca" aria-labelledby="seguranca-title">
          <h2 id="seguranca-title">Como protegemos</h2>
          <ul>
            <li>Arquivos criptografados em repouso com AES-256-GCM.</li>
            <li>Senhas de contas e de links guardadas só como hash argon2id.</li>
            <li>Links com identificador aleatório de 128 bits, impossível de adivinhar.</li>
            <li>Conexão protegida, sessão em cookie inacessível a scripts e proteção contra requisições forjadas.</li>
            <li>Cada conta só enxerga os próprios dados.</li>
            <li>
              Trocar a senha desconecta os outros dispositivos, e você pode encerrar as outras sessões a qualquer
              momento em <Link to="/configuracoes">Configurações → Segurança</Link>.
            </li>
          </ul>
        </section>

        <section id="retencao" aria-labelledby="retencao-title">
          <h2 id="retencao-title">Por quanto tempo guardamos</h2>
          <ul>
            <li>
              <strong>Cadastro, arquivos, links, contatos e histórico:</strong> enquanto sua conta existir. Ao excluir a
              conta, apagamos tudo na hora, inclusive os arquivos criptografados.
            </li>
            <li>
              <strong>Sessões:</strong> até 7 dias, ou até você sair, trocar a senha ou encerrar as outras sessões.
            </li>
            <li>
              <strong>Registros técnicos de acesso:</strong> {LEGAL.accessLogMonths} meses, como exige o art. 15 do
              Marco Civil da Internet (Lei nº 12.965/2014). Depois disso, são apagados.
            </li>
          </ul>
        </section>

        <section id="compartilhamento" aria-labelledby="compartilhamento-title">
          <h2 id="compartilhamento-title">Com quem compartilhamos</h2>
          <p>
            Não vendemos nem alugamos seus dados. Eles só chegam a quem você mesmo compartilhar por link e aos
            fornecedores de infraestrutura que hospedam o serviço, sob contrato e apenas para essa finalidade. Também
            podemos fornecê-los a autoridades quando houver ordem judicial ou obrigação legal.
          </p>
          <p>Fornecedores que tratam dados em nosso nome (operadores):</p>
          <ul>
            {LEGAL.processors.map((processor) => (
              <li key={processor.name}>
                <strong>{processor.name}:</strong> {processor.role} ({processor.country}).
              </li>
            ))}
          </ul>
        </section>

        <section id="transferencia" aria-labelledby="transferencia-title">
          <h2 id="transferencia-title">Transferência internacional</h2>
          <p>
            Parte dos fornecedores acima mantém servidores fora do Brasil, então seus dados podem ser guardados no
            exterior. Essa transferência é feita para executar o contrato com você e com garantias contratuais de
            proteção equivalentes às da LGPD, conforme o art. 33 e a regulamentação da ANPD. Os arquivos ficam
            criptografados também lá.
          </p>
        </section>

        <section id="direitos" aria-labelledby="direitos-title">
          <h2 id="direitos-title">Seus direitos</h2>
          <p>Pelo art. 18 da LGPD, você pode, a qualquer momento:</p>
          <ul>
            <li>
              <strong>Confirmar e acessar seus dados, e levá-los para outro serviço:</strong> em{' '}
              <Link to="/configuracoes#seus-dados">Configurações → Seus dados → Baixar meus dados</Link>.
            </li>
            <li>
              <strong>Corrigir dados:</strong> em <Link to="/configuracoes">Configurações → Conta</Link>.
            </li>
            <li>
              <strong>Eliminar seus dados:</strong> em{' '}
              <Link to="/configuracoes#seus-dados">Configurações → Seus dados → Excluir conta</Link>.
            </li>
            <li>
              <strong>Saber com quem compartilhamos seus dados:</strong> veja{' '}
              <a href="#compartilhamento">Com quem compartilhamos</a>.
            </li>
            <li>
              <strong>
                Pedir anonimização, bloqueio ou informações, se opor a um tratamento ou revisar uma decisão:
              </strong>{' '}
              pelo contato abaixo.
            </li>
            <li>
              <strong>Reclamar à ANPD</strong> (Autoridade Nacional de Proteção de Dados), em{' '}
              <a href="https://www.gov.br/anpd" rel="noreferrer" target="_blank">
                gov.br/anpd
              </a>
              .
            </li>
          </ul>
        </section>

        <section id="incidentes" aria-labelledby="incidentes-title">
          <h2 id="incidentes-title">Incidentes de segurança</h2>
          <p>
            Se acontecer um incidente que possa trazer risco ou dano a você, avisamos você e a ANPD em prazo razoável,
            explicando o que aconteceu, quais dados foram afetados e o que estamos fazendo, como prevê o art. 48 da
            LGPD.
          </p>
        </section>

        <section id="alteracoes" aria-labelledby="alteracoes-title">
          <h2 id="alteracoes-title">Mudanças nesta política</h2>
          <p>
            Quando esta política mudar, atualizamos a data no topo da página. Mudanças relevantes, como uma nova
            finalidade ou um novo fornecedor, são avisadas na sua conta antes de valer.
          </p>
        </section>

        <section id="contato" aria-labelledby="contato-title">
          <h2 id="contato-title">Contato do encarregado</h2>
          <p>
            Dúvidas ou pedidos sobre seus dados: <a href={`mailto:${LEGAL.dpoEmail}`}>{LEGAL.dpoEmail}</a>. Respondemos
            em até 15 dias, como prevê o art. 19 da LGPD.
          </p>
        </section>
      </main>
    </div>
  )
}
