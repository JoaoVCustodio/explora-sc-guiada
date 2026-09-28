import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Compass,
  Globe2,
  MapPin,
  Navigation,
  Plus,
  Sparkles,
  Star,
  Store,
  Waves,
  Mountain,
  UtensilsCrossed,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { HeroFilm } from "@/components/HeroFilm";
import { LandingMap } from "@/components/LandingMap";
import "./landing.css";

const sampleDays = [
  {
    label: "Pé na areia",
    places: [
      {
        name: "Praia da Joaquina",
        period: "Manhã",
        duration: "2h",
        text: "Mar, dunas e um começo de dia sem pressa.",
      },
      {
        name: "Lagoa da Conceição",
        period: "Tarde",
        duration: "1h30",
        text: "Paisagem, uma caminhada e tempo para descobrir.",
      },
    ],
  },
  {
    label: "Histórias pelo caminho",
    places: [
      {
        name: "Centro histórico",
        period: "Manhã",
        duration: "2h",
        text: "Arquitetura e histórias para olhar mais de perto.",
      },
      {
        name: "Mercado Público",
        period: "Tarde",
        duration: "1h30",
        text: "Uma pausa para conhecer os sabores da cidade.",
      },
    ],
  },
  {
    label: "Um outro ritmo",
    places: [
      {
        name: "Santo Antônio de Lisboa",
        period: "Manhã",
        duration: "2h",
        text: "Ruas tranquilas, cultura e vista para a baía.",
      },
      {
        name: "Praia de Daniela",
        period: "Tarde",
        duration: "2h",
        text: "Mais um encontro com o mar para fechar a viagem.",
      },
    ],
  },
];
const faqs = [
  [
    "Como funcionam as gerações gratuitas?",
    "Novos usuários recebem 3 créditos gratuitos. Cada roteiro gerado com sucesso usa 1 crédito, independentemente de ter 1 ou 7 dias. Não há mensalidade.",
  ],
  [
    "Posso continuar usando meus roteiros sem créditos?",
    "Sim. Seus roteiros salvos, mapas, Comunidade, avaliações e parceiros continuam disponíveis. Os créditos são necessários apenas para gerar um novo roteiro.",
  ],
  [
    "O roteiro já faz reservas para mim?",
    "Não. O ExploraSC ajuda a planejar a viagem. Confira horários, disponibilidade, preços e condições dos locais antes de sair.",
  ],
  [
    "E quando os créditos acabarem?",
    "Os pacotes de créditos serão disponibilizados futuramente. A compra ainda não está ativa e nenhuma cobrança é feita agora.",
  ],
];

export default function Landing() {
  const { user } = useAuth();
  const [day, setDay] = useState(0);
  const [faq, setFaq] = useState<number | null>(null);
  const start = user ? "/planejar" : "/auth?mode=signup";
  const cta = user ? "Abrir meu planejador" : "Criar roteiro grátis";
  return (
    <div className="landing">
      <a className="landing-skip" href="#landing-main">
        Ir para o conteúdo
      </a>
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="ExploraSC — início">
          <Compass size={30} aria-hidden="true" />
          <span>
            Explora<span>SC</span>
          </span>
        </Link>
        <nav aria-label="Navegação pública" className="landing-nav">
          <a href="#experiencia">A experiência</a>
          <a href="#como-funciona">Como funciona</a>
          <Link to="/comunidade">
            Comunidade
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </nav>
        <div className="landing-header-actions">
          {!user && (
            <Link to="/auth" className="landing-login">
              Entrar
            </Link>
          )}
          <Link className="landing-header-cta" to={start}>
            {user ? "Meu planejador" : "Começar grátis"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="hero-title">
          <picture className="hero-landscape">
            <source
              media="(max-width: 767px)"
              srcSet="/landing/coast-mobile.webp"
            />
            <img
              src="/landing/coast.webp"
              width="1440"
              height="960"
              alt=""
              fetchPriority="high"
            />
          </picture>
          <div className="hero-shade" />
          <div className="landing-container hero-grid">
            <div className="hero-copy">
              <p className="landing-kicker">
                <span /> SANTA CATARINA, ALÉM DO ÓBVIO
              </p>
              <h1 id="hero-title">
                Seu próximo
                <br />
                destino tem
                <br />
                <em>o seu jeito.</em>
              </h1>
              <p className="hero-description">
                Transforme o que você gosta em um roteiro por Santa Catarina. A
                IA organiza os dias. Você vive a viagem.
              </p>
              <div className="hero-actions">
                <Link to={start} className="landing-cta">
                  {cta}
                  <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
                <Link to="/comunidade" className="hero-secondary">
                  Explorar a comunidade
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
              <p className="hero-free">
                <Check size={15} aria-hidden="true" />3 gerações gratuitas para
                novos usuários. Sem mensalidade.
              </p>
            </div>
            <div className="hero-product">
              <div className="hero-product-note">
                <span>UMA IDEIA DE VIAGEM.</span>
                <span>UM MUNDO DE POSSIBILIDADES.</span>
              </div>
              <HeroFilm />
            </div>
          </div>
          <div className="landing-container hero-footer">
            <a href="#experiencia">
              <ArrowDown size={15} aria-hidden="true" />O caminho começa aqui
            </a>
            <span>
              Natureza, cultura e novos encontros.
              <small>Paisagem ilustrativa</small>
            </span>
          </div>
        </section>

        <section id="experiencia" className="landing-intro landing-container">
          <p className="landing-kicker">MENOS PLANEJAMENTO. MAIS DESCOBERTA.</p>
          <div className="intro-grid">
            <h2>
              Uma viagem boa
              <br />
              começa com <em>você.</em>
            </h2>
            <div>
              <p>
                Um mergulho cedo. Uma trilha leve. Uma mesa com vista. Não
                existe um único jeito de conhecer Santa Catarina.
              </p>
              <p className="subtle">
                O ExploraSC conecta seus interesses a lugares para explorar — e
                coloca tudo em um roteiro que faz sentido para a sua viagem.
              </p>
            </div>
          </div>
          <div className="interest-strip">
            <span>
              <Waves aria-hidden="true" />
              Entre o mar
            </span>
            <i />
            <span>
              <Mountain aria-hidden="true" />e a serra
            </span>
            <i />
            <span>
              <UtensilsCrossed aria-hidden="true" />
              há muito para descobrir.
            </span>
          </div>
        </section>

        <section
          id="como-funciona"
          className="landing-process landing-container"
        >
          <div className="section-top">
            <div>
              <p className="landing-kicker">
                DO PRIMEIRO DESEJO AO PRIMEIRO PASSO
              </p>
              <h2>
                Seu roteiro.
                <br />
                <em>Sem se perder nas abas.</em>
              </h2>
            </div>
            <p>
              Você conta um pouco sobre a viagem.
              <br />O resto começa a tomar forma.
            </p>
          </div>
          <div className="process-grid">
            {[
              {
                n: "01",
                icon: Compass,
                title: "Conte o que te move.",
                body: "Escolha a região, seus interesses e quantos dias quer explorar.",
              },
              {
                n: "02",
                icon: Sparkles,
                title: "Deixe as ideias se encontrarem.",
                body: "A IA transforma suas escolhas em uma sugestão de roteiro organizada por dias.",
              },
              {
                n: "03",
                icon: Navigation,
                title: "Encontre seu caminho.",
                body: "Confira atrações, períodos, duração e trajetos no mapa. Salve para consultar depois.",
              },
            ].map(({ n, icon: Icon, title, body }) => (
              <article key={n} className="process-step">
                <div>
                  <span>{n}</span>
                  <Icon size={23} aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-itinerary" aria-labelledby="days-title">
          <div className="landing-container itinerary-grid">
            <div className="story-copy">
              <p className="landing-kicker">CADA DIA, UMA NOVA CAMADA</p>
              <h2 id="days-title">
                Espaço para descobrir.
                <br />
                <em>Tempo para aproveitar.</em>
              </h2>
              <p>
                Uma visão clara do que vem pela frente. Navegue pelos dias,
                descubra cada atração e encontre os lugares no mapa.
              </p>
              <ul>
                <li>
                  <Check size={17} aria-hidden="true" />
                  Dias e períodos organizados
                </li>
                <li>
                  <Check size={17} aria-hidden="true" />
                  Duração estimada de cada visita
                </li>
                <li>
                  <Check size={17} aria-hidden="true" />
                  Tudo salvo na sua conta
                </li>
              </ul>
              <Link to={start} className="landing-text-link">
                Montar a minha viagem
                <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
            </div>
            <div className="itinerary-demo">
              <div className="demo-head">
                <span>
                  <Compass size={19} aria-hidden="true" />
                  ExploraSC
                </span>
                <span>IDEIA DE VIAGEM</span>
              </div>
              <div className="demo-content">
                <p className="demo-overline">GRANDE FLORIANÓPOLIS</p>
                <h3>Três dias, muitos caminhos.</h3>
                <div
                  className="demo-day-tabs"
                  role="group"
                  aria-label="Selecionar dia da demonstração"
                >
                  {sampleDays.map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      aria-pressed={day === i}
                      onClick={() => setDay(i)}
                    >
                      Dia {i + 1}
                    </button>
                  ))}
                </div>
                <p className="demo-day-label" role="status">
                  {sampleDays[day].label}
                </p>
                {sampleDays[day].places.map((place, i) => (
                  <article className="demo-place" key={place.name}>
                    <span className="demo-place-number">{day * 2 + i + 1}</span>
                    <div>
                      <h4>{place.name}</h4>
                      <p>{place.text}</p>
                      <span>
                        {place.period} <i /> {place.duration}
                      </span>
                    </div>
                    <MapPin size={18} aria-hidden="true" />
                  </article>
                ))}
                <p className="demo-disclaimer">
                  Exemplo ilustrativo. Seu roteiro será gerado a partir das suas
                  escolhas.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-map-section landing-container">
          <div className="map-demo">
            <LandingMap />
            <div className="map-demo-badge">
              <Navigation size={19} aria-hidden="true" />
              <span>
                Uma visão da viagem inteira.<small>Mapa ilustrativo</small>
              </span>
            </div>
          </div>
          <div className="story-copy">
            <p className="landing-kicker">DA LISTA DE LUGARES AO CAMINHO</p>
            <h2>
              A viagem também
              <br />
              acontece <em>entre os pontos.</em>
            </h2>
            <p>
              Veja onde ficam as atrações e como os trajetos conectam cada
              parada. No app, o mapa é interativo e acompanha o roteiro dia a
              dia.
            </p>
            <div className="map-key">
              <span>
                <i />
                Atrações numeradas
              </span>
              <span>
                <i />
                Trajetos no mapa
              </span>
            </div>
            <Link to={start} className="landing-text-link">
              Descobrir meu próximo caminho
              <ArrowUpRight size={19} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="landing-shared">
          <div className="landing-container">
            <div className="section-top">
              <div>
                <p className="landing-kicker">VIAGENS QUE CONTINUAM</p>
                <h2>
                  Guarde as ideias.
                  <br />
                  <em>Compartilhe as descobertas.</em>
                </h2>
              </div>
              <p>
                Um roteiro pode inspirar muitas viagens.
                <br />
                Inclusive a próxima.
              </p>
            </div>
            <div className="shared-grid">
              <article>
                <Bookmark aria-hidden="true" />
                <h3>Seu lugar de guardar caminhos.</h3>
                <p>
                  Salve os roteiros na sua conta e volte a eles quando quiser
                  planejar a próxima saída.
                </p>
              </article>
              <article>
                <Globe2 aria-hidden="true" />
                <h3>Uma descoberta leva a outra.</h3>
                <p>
                  Publique seu roteiro, explore a Comunidade e veja avaliações
                  de outros viajantes.
                </p>
                <Link to="/comunidade">
                  Conhecer a comunidade
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </article>
              <article>
                <Store aria-hidden="true" />
                <h3>Olhe também para quem é daqui.</h3>
                <p>
                  Conheça os parceiros locais apresentados junto aos roteiros e
                  encontre outras possibilidades na região.
                </p>
              </article>
            </div>
            <p className="community-note">
              <Star size={15} aria-hidden="true" />A Comunidade é acessada com
              sua conta gratuita.
            </p>
          </div>
        </section>

        <section className="landing-faq landing-container">
          <div>
            <p className="landing-kicker">ANTES DE PEGAR A ESTRADA</p>
            <h2>
              Algumas respostas.
              <br />
              <em>Muitos destinos.</em>
            </h2>
          </div>
          <div>
            {faqs.map(([q, a], i) => (
              <div className="faq-item" key={q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={faq === i}
                    aria-controls={`landing-faq-${i}`}
                    onClick={() => setFaq(faq === i ? null : i)}
                  >
                    {q}
                    <Plus
                      size={18}
                      aria-hidden="true"
                      className={faq === i ? "is-open" : ""}
                    />
                  </button>
                </h3>
                <div id={`landing-faq-${i}`} hidden={faq !== i}>
                  <p>{a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-final">
          <div className="landing-container">
            <p className="landing-kicker">SEU PRÓXIMO “VAMOS?” COMEÇA AQUI</p>
            <h2>
              Santa Catarina é o destino.
              <br />
              <em>A viagem é sua.</em>
            </h2>
            <Link to={start} className="landing-cta">
              {cta}
              <ArrowUpRight size={21} aria-hidden="true" />
            </Link>
            <p>3 gerações gratuitas para começar. Sem mensalidade.</p>
          </div>
          <svg
            viewBox="0 0 1000 400"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M-40 300C160 0 240 450 510 220S820 40 1050 140" />
          </svg>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <Link to="/" className="landing-brand">
          <Compass size={26} aria-hidden="true" />
          <span>
            Explora<span>SC</span>
          </span>
        </Link>
        <p>Feito para descobrir Santa Catarina.</p>
        <nav aria-label="Links do rodapé">
          <Link to="/planejar">Planejar viagem</Link>
          <Link to="/comunidade">Comunidade</Link>
          <a href="#hero-title">Voltar ao topo ↑</a>
        </nav>
      </footer>
    </div>
  );
}
