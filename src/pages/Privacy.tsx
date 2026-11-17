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
  { id: 'direitos', title: 'Seus direitos' },
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
              hash dela. Quem abre um link não é identificado: só registramos que houve um acesso.
            </li>
            <li>
              <strong>Histórico de atividade:</strong> envios, criação de links e acessos aos seus arquivos.
            </li>
            <li>
              <strong>Registros técnicos:</strong> endereço IP, data e hora das requisições, usados para segurança.
            </li>
          </ul>
          <p>Não coletamos dados sensíveis de propósito nem tratamos dados para publicidade ou criação de perfil.</p>
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
          </ul>
        </section>

        <section id="retencao" aria-labelledby="retencao-title">
          <h2 id="retencao-title">Por quanto tempo guardamos</h2>
          <p>
            Seus dados ficam guardados enquanto sua conta existir. Ao excluir a conta, apagamos na hora o cadastro, os
            arquivos, os links e o histórico. Só os registros técnicos de acesso podem ser mantidos pelo prazo que a lei
            exige.
          </p>
        </section>

        <section id="compartilhamento" aria-labelledby="compartilhamento-title">
          <h2 id="compartilhamento-title">Com quem compartilhamos</h2>
          <p>
            Não vendemos nem alugamos seus dados. Eles só chegam a quem você mesmo compartilhar por link e aos
            fornecedores de infraestrutura que hospedam o serviço, sob contrato e apenas para essa finalidade. Também
            podemos fornecê-los a autoridades quando houver ordem judicial ou obrigação legal.
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
              <strong>Pedir informações, se opor a um tratamento ou revisar uma decisão:</strong> pelo contato abaixo.
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
