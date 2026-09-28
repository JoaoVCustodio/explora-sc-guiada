import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import {
  ArrowLeft,
  Bookmark,
  Coins,
  Compass,
  ListOrdered,
  MapPin,
  Plus,
} from "lucide-react";
import { ItineraryForm } from "../src/components/ItineraryForm";
import { LocalCard } from "../src/components/LocalCard";
import { RoteiroCard } from "../src/components/RoteiroCard";
import { StatsBar } from "../src/components/StatsBar";
import { LoadingAnimation } from "../src/components/LoadingAnimation";
import { Button } from "../src/components/ui/button";
import { OfflineMap } from "./OfflineMap";
import { demoDays } from "./demo-data";
import "./app.css";
import "./film.css";

const noop = () => {};
const clamp = {
  extrapolateLeft: "clamp" as const,
  extrapolateRight: "clamp" as const,
};
const tween = (f: number, start: number, end: number, from = 0, to = 1) =>
  interpolate(f, [start, end], [from, to], {
    ...clamp,
    easing: Easing.inOut(Easing.cubic),
  });

function AppHeader({ complete = false }: { complete?: boolean }) {
  return (
    <header
      className="absolute inset-x-0 top-0 z-50 border-b border-border/70 bg-background/90"
      style={{ height: 76 }}
    >
      <div className="mx-auto flex h-full items-center justify-between px-10">
        <div className="flex items-center gap-2.5 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" />
          </span>
          <span>
            Explora<span className="text-primary">SC</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="h-11 gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 text-primary"
          >
            <Coins />
            {complete ? 2 : 3}
            <span>créditos</span>
            <Plus className="!h-3.5 !w-3.5 opacity-60" />
          </Button>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            JV
          </span>
        </div>
      </div>
    </header>
  );
}

function Planner({ frame }: { frame: number }) {
  const scroll =
    tween(frame, 38, 58, 0, 210) +
    tween(frame, 90, 110, 0, 150) +
    tween(frame, 118, 138, 0, 165);
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div className="app-backdrop" />
      <div
        style={{
          position: "absolute",
          top: 112,
          left: 0,
          right: 0,
          transform: `translateY(${-scroll}px)`,
        }}
      >
        <ItineraryForm
          days={frame >= 30 ? 3 : 1}
          onDaysChange={noop}
          preferences=""
          errorMessage={null}
          selectedInterests={
            frame >= 84
              ? ["praias", "gastronomia"]
              : frame >= 64
                ? ["praias"]
                : []
          }
          selectedRegions={frame >= 108 ? ["Grande Florianópolis"] : []}
          onInterestsChange={noop}
          onRegionsChange={noop}
          onPreferencesChange={noop}
          onSubmit={noop}
        />
      </div>
      <AppHeader />
    </div>
  );
}

function Results({ frame }: { frame: number }) {
  const selected = frame < 232 ? 1 : frame < 254 ? 2 : frame < 276 ? 3 : 1;
  const scroll =
    tween(frame, 202, 222, 0, 205) + tween(frame, 293, 325, 0, 598);
  const changeAt =
    selected === 2 ? 232 : selected === 3 ? 254 : frame >= 276 ? 276 : 180;
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div className="app-backdrop" />
      <div
        style={{
          position: "absolute",
          top: 106,
          left: 48,
          right: 48,
          transform: `translateY(${-scroll}px)`,
        }}
      >
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Seu roteiro personalizado</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Pronto para explorar?
            </h1>
            <p className="mt-2 text-muted-foreground">
              Confira os locais e selecione um cartão para encontrá-lo no mapa.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <MapPin />
              Ver mapa
            </Button>
            <Button variant="outline">
              <ArrowLeft />
              Ajustar preferências
            </Button>
            <Button>
              <Bookmark />
              Salvar roteiro
            </Button>
          </div>
        </div>
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: "minmax(0,1fr) 320px" }}
        >
          <RoteiroCard
            title="Três dias pela ilha de Santa Catarina"
            description="Praias, natureza e sabores locais: uma viagem pela Grande Florianópolis, organizada para descobrir um pouco mais a cada dia."
          />
          <StatsBar locationsCount={6} estimatedTime="11 horas" />
        </div>
        <section className="mt-10">
          <div className="mb-5">
            <h2 className="flex items-center gap-2 text-2xl font-bold">
              <ListOrdered className="h-6 w-6 text-primary" />
              Locais do roteiro
            </h2>
            <p className="mt-1 text-muted-foreground">
              A numeração dos cartões é a mesma usada nos marcadores.
            </p>
          </div>
          <div className="flex gap-2 pb-3">
            {[null, 1, 2, 3].map((day) => (
              <Button
                key={day ?? "all"}
                variant={selected === day ? "default" : "outline"}
                className={`min-h-11 rounded-full px-5 ${selected === day ? "shadow-sm" : "border-border/80 bg-card text-muted-foreground"}`}
              >
                {day === null ? "Todos" : `Dia ${day}`}
              </Button>
            ))}
          </div>
          <p className="mb-5 mt-2 text-sm text-muted-foreground">
            Dia {selected} · 2 atrações para explorar
          </p>
          <div className="grid grid-cols-2 gap-4" style={{ height: 236 }}>
            {demoDays[selected - 1].map((place, i) => {
              const enter = tween(
                frame,
                changeAt + i * 3,
                changeAt + 12 + i * 3,
              );
              return (
                <div
                  key={place.name}
                  style={{
                    height: "100%",
                    opacity: enter,
                    transform: `translateY(${(1 - enter) * 22}px)`,
                  }}
                >
                  <LocalCard
                    {...place}
                    position={(selected - 1) * 2 + i + 1}
                    hasCoordinates
                    isActive={frame >= 287 && selected === 1 && i === 0}
                    onLocationClick={noop}
                  />
                </div>
              );
            })}
          </div>
        </section>
        <div className="mt-10">
          <OfflineMap frame={frame} />
        </div>
      </div>
      <AppHeader complete />
    </div>
  );
}

// Cursor keyframes follow the real component positions, including page scroll.
const pointer = [
  [0, 1090, 640],
  [16, 538, 564],
  [30, 538, 564],
  [42, 535, 520],
  [59, 400, 508],
  [64, 400, 508],
  [78, 880, 508],
  [84, 880, 508],
  [99, 400, 572],
  [108, 400, 572],
  [137, 644, 610],
  [146, 644, 610],
  [155, 1080, 650],
  [220, 252, 345],
  [232, 252, 345],
  [248, 334, 345],
  [254, 334, 345],
  [270, 172, 345],
  [276, 172, 345],
  [284, 335, 620],
  [290, 335, 620],
  [325, 980, 550],
  [352, 1010, 585],
  [419, 1010, 585],
];
function Cursor({ frame }: { frame: number }) {
  const x = interpolate(
    frame,
    pointer.map((p) => p[0]),
    pointer.map((p) => p[1]),
    { ...clamp, easing: Easing.inOut(Easing.cubic) },
  );
  const y = interpolate(
    frame,
    pointer.map((p) => p[0]),
    pointer.map((p) => p[2]),
    { ...clamp, easing: Easing.inOut(Easing.cubic) },
  );
  const clicks = [30, 64, 84, 108, 146, 232, 254, 276, 290];
  const since = frame - Math.max(...clicks.filter((c) => c <= frame), -100);
  const pulse = since < 12 ? since / 12 : 1;
  const opacity =
    frame < 150 ? 1 : frame < 208 ? 0 : 1 - tween(frame, 324, 340);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        zIndex: 80,
        transform: `translate(${x}px,${y}px)`,
        opacity,
        pointerEvents: "none",
      }}
    >
      {since < 12 && (
        <span
          style={{
            position: "absolute",
            width: 44,
            height: 44,
            left: -20,
            top: -20,
            border: "2px solid #128a80",
            borderRadius: "50%",
            opacity: 1 - pulse,
            transform: `scale(${0.3 + pulse})`,
          }}
        />
      )}
      <svg
        width="30"
        height="36"
        viewBox="0 0 30 36"
        style={{
          filter: "drop-shadow(0 3px 3px #122c3b55)",
          transform: `scale(${since < 5 ? 0.88 : 1})`,
        }}
      >
        <path
          d="M3 2L3 28L10 22L16 34L21 31L15 20L25 19Z"
          fill="#172e3c"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function ProductDemo() {
  const frame = useCurrentFrame();
  const reset = tween(frame, 402, 419);
  const plannerOpacity = 1 - tween(frame, 148, 156);
  const resultOpacity = tween(frame, 176, 186);
  const zoom =
    1 +
    tween(frame, 10, 30, 0, 0.018) -
    tween(frame, 136, 148, 0, 0.018) +
    tween(frame, 326, 380, 0, 0.018);
  return (
    <AbsoluteFill
      className="film-root"
      style={{ background: "hsl(var(--background))" }}
    >
      <AbsoluteFill
        style={{ transform: `scale(${zoom})`, transformOrigin: "50% 48%" }}
      >
        <AbsoluteFill style={{ opacity: plannerOpacity }}>
          <Planner frame={frame} />
        </AbsoluteFill>
        {frame >= 148 && frame < 186 && (
          <AbsoluteFill
            className="film-loading"
            style={
              {
                opacity: tween(frame, 148, 157) * (1 - tween(frame, 176, 186)),
                justifyContent: "center",
                "--loading-angle": `${frame * 8}deg`,
              } as React.CSSProperties
            }
          >
            <LoadingAnimation
              compact
              message="Organizando os locais do roteiro..."
            />
            <AppHeader />
          </AbsoluteFill>
        )}
        {frame >= 176 && (
          <AbsoluteFill style={{ opacity: resultOpacity }}>
            <Results frame={frame} />
          </AbsoluteFill>
        )}
        <Cursor frame={frame} />
      </AbsoluteFill>
      {frame >= 402 && (
        <AbsoluteFill style={{ opacity: reset }}>
          <Planner frame={0} />
          <Cursor frame={0} />
        </AbsoluteFill>
      )}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 90,
          background: "hsl(var(--background) / .95)",
          borderTop: "1px solid hsl(var(--border))",
          padding: "8px 18px",
          fontSize: 11,
          color: "hsl(var(--muted-foreground))",
          textAlign: "right",
        }}
      >
        Demonstração com dados locais · tempo de geração abreviado
      </div>
    </AbsoluteFill>
  );
}
