import { Compass, Expand, Minus, Plus } from "lucide-react";
import { interpolate } from "remotion";
import { Button } from "../src/components/ui/button";
import "../src/components/map.css";

/** MapView's presentation, with a local SVG base instead of a live map/network hooks. */
export function OfflineMap({ frame }: { frame: number }) {
  const progress = interpolate(frame, [320, 375], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <section className="route-map overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5">
      <div className="flex items-center justify-between gap-4 px-7 pb-4 pt-6">
        <div>
          <p className="eyebrow">Explore o caminho</p>
          <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Compass className="h-6 w-6 text-primary" />
            Sua viagem no mapa
          </h2>
        </div>
        <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
          Trajetos viários · ordem do roteiro
        </span>
      </div>
      <div className="flex gap-2 px-7 pb-5">
        {["Todos", "Dia 1", "Dia 2", "Dia 3"].map((day, i) => (
          <Button
            key={day}
            variant={i === 1 ? "default" : "outline"}
            className="min-h-11 rounded-full px-5"
          >
            {day}
          </Button>
        ))}
      </div>
      <div
        className="relative border-y border-border"
        style={{ height: 430, overflow: "hidden" }}
      >
        <svg
          viewBox="0 0 1120 430"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ background: "#acd9e5" }}
        >
          <defs>
            <pattern
              id="blocks"
              width="36"
              height="34"
              patternUnits="userSpaceOnUse"
            >
              <rect x="4" y="4" width="27" height="24" rx="3" fill="#e2dfd4" />
              <path d="M0 0H36M0 0V34" stroke="white" strokeWidth="5" />
            </pattern>
          </defs>
          <path
            d="M0 0H310L288 55L318 108L259 154L284 214L240 294L264 430H0Z"
            fill="#eef0e6"
          />
          <path
            d="M454 -20L758 -20L740 45L776 76L805 151L844 212L823 271L866 330L893 450H434L456 374L421 329L449 267L407 225L436 172L397 120L432 63Z"
            fill="#f3f1e8"
            stroke="#95c7c8"
            strokeWidth="2"
          />
          <path
            d="M445 0L643 0L659 69L588 95L622 135L548 192L572 230L503 291L535 351L488 430H441L456 373L420 329L449 267L407 225L436 172L397 120Z"
            fill="#cddfc3"
          />
          <path
            d="M630 -20C584 42 712 56 652 125S706 198 678 253L717 276L756 215L735 157L725 92L693 11Z"
            fill="#acd9e5"
            stroke="#99c9d1"
            strokeWidth="2"
          />
          <path
            d="M459 156L550 166L594 230L568 320L600 430H472L449 370L471 319L430 255Z"
            fill="url(#blocks)"
          />
          <path
            d="M737 208L791 220L821 275L841 430H758L725 326L703 270Z"
            fill="#e8e2c9"
          />
          {[
            "M466 -20L495 62L469 131L511 208L562 242L596 252L633 282L694 293L746 347L776 440",
            "M277 207L344 217L429 223L511 208",
            "M562 242L582 200L619 167L630 129",
            "M694 293L734 257L749 210",
            "M493 70L562 62L608 30",
          ].map((d) => (
            <g key={d}>
              <path d={d} fill="none" stroke="#d3bfa2" strokeWidth="8" />
              <path d={d} fill="none" stroke="#fffdf6" strokeWidth="5" />
            </g>
          ))}
          <g fill="#61736b" fontFamily="system-ui" fontSize="13">
            <text x="83" y="190">
              São José
            </text>
            <text x="346" y="266" fontWeight="600">
              Florianópolis
            </text>
            <text
              x="585"
              y="150"
              transform="rotate(-66 585 150)"
              fill="#55929c"
            >
              Lagoa da Conceição
            </text>
            <text x="900" y="220" fill="#589cae" fontStyle="italic">
              Oceano Atlântico
            </text>
            <text x="463" y="98" fontSize="11">
              Parque do Itacorubi
            </text>
            <text x="841" y="355">
              Joaquina
            </text>
          </g>
          <path
            d="M786 350L760 344L746 347L726 330L710 309L694 293L665 291L633 282L619 272L596 252L579 249"
            fill="none"
            stroke="white"
            strokeWidth="9"
            strokeLinecap="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - progress}
          />
          <path
            d="M786 350L760 344L746 347L726 330L710 309L694 293L665 291L633 282L619 272L596 252L579 249"
            fill="none"
            stroke="#2563eb"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset={1 - progress}
          />
        </svg>
        {[
          [786, 350],
          [579, 249],
        ].map(([x, y], i) => {
          const entry = interpolate(
            frame,
            [318 + i * 34, 328 + i * 34],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          );
          return (
            <div
              key={i}
              className={`route-marker ${i === 0 ? "is-selected" : ""}`}
              style={{
                position: "absolute",
                left: `${(x / 1120) * 100}%`,
                top: y - 42,
                opacity: entry,
                transform: `translate(-50%,${(1 - entry) * -25}px) scale(${0.7 + 0.3 * entry})`,
              }}
            >
              {i + 1}
            </div>
          );
        })}
        <div className="absolute right-5 top-5 flex flex-col gap-2">
          {[Plus, Minus, Expand].map((Icon, i) => (
            <Button
              key={i}
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl bg-card shadow-md"
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}
        </div>
        <span
          style={{
            position: "absolute",
            bottom: 9,
            right: 12,
            fontSize: 11,
            background: "#fffffff0",
            padding: "3px 9px",
            borderRadius: 6,
          }}
        >
          Base e trajeto demonstrativos · dados locais
        </span>
      </div>
      <div className="flex items-center gap-10 px-7 py-5">
        <div>
          <p className="text-sm font-bold">Dia 1</p>
          <p className="text-sm text-muted-foreground">2 paradas · 2 no mapa</p>
        </div>
        <div>
          <p className="text-lg font-bold">6,4 km</p>
          <p className="text-xs text-muted-foreground">Distância viária</p>
        </div>
        <div>
          <p className="text-lg font-bold">16 min</p>
          <p className="text-xs text-muted-foreground">Deslocamento estimado</p>
        </div>
      </div>
    </section>
  );
}
