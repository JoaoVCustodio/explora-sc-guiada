import { useId } from "react";

/** Decorative cartography, deliberately illustrative rather than a navigable map. */
export function LandingMap({ progress = 1 }: { progress?: number }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden="true"
      className="landing-map-art"
    >
      <defs>
        <pattern
          id={`${id}-grid`}
          width="48"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          <path d="M48 0H0V48" stroke="#e0e8db" strokeOpacity=".07" />
        </pattern>
        <linearGradient
          id={`${id}-sea`}
          x1="600"
          y1="0"
          x2="0"
          y2="600"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#265e5b" />
          <stop offset="1" stopColor="#102e2b" />
        </linearGradient>
      </defs>
      <rect width="600" height="600" fill={`url(#${id}-sea)`} />
      <path
        d="M0 0H402C396 40 463 65 405 113S380 172 408 205S329 253 361 311S293 361 321 417S235 464 245 511S200 560 194 600H0Z"
        fill="#28473a"
      />
      {Array.from({ length: 10 }, (_, i) => (
        <path
          key={i}
          d={`M${30 + i * 28} -20C${-90 + i * 34} 160 ${330 + i * 6} 155 ${145 + i * 17} 320S${-10 + i * 22} 490 ${55 + i * 18} 660`}
          stroke="#9eb298"
          strokeOpacity=".13"
          strokeWidth="1.3"
        />
      ))}
      <path
        d="M402 0C396 40 463 65 405 113S380 172 408 205S329 253 361 311S293 361 321 417S235 464 245 511S200 560 194 600"
        stroke="#c3d4bc"
        strokeOpacity=".5"
        strokeWidth="2"
      />
      <rect width="600" height="600" fill={`url(#${id}-grid)`} />
      <path
        d="M190 162C278 148 322 207 301 257S184 316 241 373S319 394 291 451"
        stroke="#132e29"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M190 162C278 148 322 207 301 257S184 316 241 373S319 394 291 451"
        stroke="#edbd72"
        strokeWidth="4"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        strokeDashoffset={1 - progress}
      />
      {[
        [190, 162],
        [301, 257],
        [241, 373],
        [291, 451],
      ].map(([x, y], i) => (
        <g key={i} opacity={progress > i * 0.24 ? 1 : 0}>
          <circle cx={x} cy={y} r="22" fill="#efbe73" fillOpacity=".14" />
          <circle
            cx={x}
            cy={y}
            r="12"
            fill="#f6efe1"
            stroke="#183d34"
            strokeWidth="3"
          />
          <text
            x={x}
            y={y + 4}
            fill="#183d34"
            textAnchor="middle"
            fontFamily="system-ui"
            fontSize="11"
            fontWeight="700"
          >
            {i + 1}
          </text>
        </g>
      ))}
      <text
        x="430"
        y="370"
        fill="#b8d3ce"
        opacity=".65"
        fontFamily="Georgia"
        fontSize="15"
        fontStyle="italic"
        transform="rotate(-70 430 370)"
      >
        Oceano Atlântico
      </text>
      <text
        x="38"
        y="545"
        fill="#c3d4bc"
        fontFamily="system-ui"
        fontSize="9"
        letterSpacing="3"
      >
        SEU PRÓXIMO CAMINHO
      </text>
      <g transform="translate(540 65)" stroke="#c3d4bc">
        <path d="M0 -16V16M-9 0H9" />
        <path d="M0 -16L-4 -7H4Z" fill="#c3d4bc" />
      </g>
      <text
        x="540"
        y="39"
        fill="#c3d4bc"
        textAnchor="middle"
        fontFamily="system-ui"
        fontSize="9"
      >
        N
      </text>
    </svg>
  );
}
