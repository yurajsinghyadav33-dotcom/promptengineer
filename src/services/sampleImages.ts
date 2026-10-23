// Standalone vector-crafted evidentiary visual assets for SignalSetu presets

export const SAMPLE_IMAGES = {
  streetlight: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="%230f172a" />
        <stop offset="100%" stop-color="%231e1b4b" />
      </linearGradient>
      <radialGradient id="glare" cx="0.5" cy="0.4" r="0.4">
        <stop offset="0%" stop-color="%23475569" stop-opacity="0.3" />
        <stop offset="100%" stop-color="%230f172a" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="600" height="400" fill="url(%23sky)" />
    <circle cx="350" cy="180" r="180" fill="url(%23glare)" />
    <!-- Street road -->
    <polygon points="0,320 600,320 600,400 0,400" fill="%231e293b" />
    <line x1="50" y1="360" x2="550" y2="360" stroke="%23fbbf24" stroke-width="4" stroke-dasharray="25,20" />
    <!-- Light pole -->
    <rect x="360" y="70" width="16" height="260" rx="3" fill="%2364748b" />
    <path d="M 368 70 Q 368 40 320 40 L 290 40" fill="none" stroke="%2364748b" stroke-width="12" stroke-linecap="round" />
    <!-- Lamp fixture dark/broken -->
    <path d="M 270 42 L 310 42 L 298 62 L 282 62 Z" fill="%23334155" stroke="%230f172a" stroke-width="2" />
    <!-- Broken bulb / spark cross -->
    <circle cx="290" cy="52" r="6" fill="%23475569" />
    <line x1="284" y1="46" x2="296" y2="58" stroke="%23ef4444" stroke-width="2" />
    <line x1="296" y1="46" x2="284" y2="58" stroke="%23ef4444" stroke-width="2" />
    <!-- Pole tag label -->
    <rect x="355" y="160" width="26" height="40" rx="2" fill="%230284c7" />
    <text x="368" y="185" fill="white" font-size="10" font-family="sans-serif" font-weight="bold" text-anchor="middle">#L-42</text>
    <text x="30" y="50" fill="%2394a3b8" font-size="14" font-family="sans-serif" font-weight="bold">EVIDENCE PHOTO: Streetlight Inactive (Night Condition)</text>
    <text x="30" y="75" fill="%2364748b" font-size="12" font-family="sans-serif">GPS: 28.6139° N, 77.2090° E • Timestamp: Day 3</text>
  </svg>`,

  medicine: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%230f172a" />
    <rect x="120" y="80" width="360" height="240" rx="16" fill="%23e2e8f0" stroke="%2394a3b8" stroke-width="4" />
    <!-- Blister pack slots -->
    <circle cx="180" cy="140" r="28" fill="%23cbd5e1" stroke="%2394a3b8" stroke-width="3" />
    <circle cx="260" cy="140" r="28" fill="%23cbd5e1" stroke="%2394a3b8" stroke-width="3" />
    <circle cx="340" cy="140" r="28" fill="%23ef4444" stroke="%23dc2626" stroke-width="3" />
    <circle cx="420" cy="140" r="28" fill="%23ef4444" stroke="%23dc2626" stroke-width="3" />
    <text x="380" y="200" fill="%23ef4444" font-size="12" font-family="sans-serif" font-weight="bold" text-anchor="middle">2 DOSE EMPTY</text>
    <circle cx="180" cy="240" r="28" fill="%23cbd5e1" stroke="%2394a3b8" stroke-width="3" />
    <circle cx="260" cy="240" r="28" fill="%23cbd5e1" stroke="%2394a3b8" stroke-width="3" />
    <circle cx="340" cy="240" r="28" fill="%23cbd5e1" stroke="%2394a3b8" stroke-width="3" />
    <circle cx="420" cy="240" r="28" fill="%23cbd5e1" stroke="%2394a3b8" stroke-width="3" />
    <!-- Strip details -->
    <text x="300" y="105" fill="%230369a1" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="middle">METFORMIN HYDROCHLORIDE 500mg IP</text>
    <text x="30" y="40" fill="%2394a3b8" font-size="14" font-family="sans-serif" font-weight="bold">EVIDENCE STRIP: Blister foil showing 2 tablets removed</text>
  </svg>`,

  transformer: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%23090d16" />
    <!-- Ground -->
    <rect x="0" y="300" width="600" height="100" fill="%231e293b" />
    <!-- Transformer Unit -->
    <rect x="220" y="110" width="160" height="190" rx="8" fill="%23475569" stroke="%23334155" stroke-width="3" />
    <!-- Bushing insulators -->
    <rect x="245" y="80" width="20" height="30" fill="%23b91c1c" />
    <rect x="290" y="80" width="20" height="30" fill="%23b91c1c" />
    <rect x="335" y="80" width="20" height="30" fill="%23b91c1c" />
    <!-- Danger spark animation simulation -->
    <path d="M 295 90 L 310 115 L 290 120 L 315 145" fill="none" stroke="%23facc15" stroke-width="4" stroke-linecap="round" />
    <circle cx="310" cy="115" r="12" fill="%23f59e0b" opacity="0.6" />
    <text x="300" y="210" fill="%23fecaca" font-size="16" font-family="sans-serif" font-weight="bold" text-anchor="middle">DANGER 11KV</text>
    <polygon points="300,165 285,195 315,195" fill="%23eab308" />
    <text x="300" y="190" fill="black" font-size="16" font-weight="bold" text-anchor="middle">!</text>
    <text x="30" y="45" fill="%23f87171" font-size="15" font-family="sans-serif" font-weight="bold">ACTIVE ELECTRICAL HAZARD: Sparks Detected on Phase C</text>
  </svg>`,

  accessibility: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="%230f172a" />
    <!-- Public Building Steps -->
    <rect x="100" y="160" width="400" height="40" fill="%2364748b" />
    <rect x="130" y="200" width="340" height="40" fill="%23475569" />
    <rect x="160" y="240" width="280" height="40" fill="%23334155" />
    <rect x="190" y="280" width="220" height="40" fill="%231e293b" />
    <!-- Building Doors -->
    <rect x="230" y="60" width="65" height="100" fill="%231e293b" stroke="%2394a3b8" />
    <rect x="305" y="60" width="65" height="100" fill="%231e293b" stroke="%2394a3b8" />
    <text x="300" y="45" fill="%23e2e8f0" font-size="14" font-family="sans-serif" font-weight="bold" text-anchor="middle">SUB-DIVISIONAL MAGISTRATE OFFICE</text>
    <!-- No Ramp Indicator -->
    <circle cx="480" cy="180" r="40" fill="%23ef4444" opacity="0.2" />
    <line x1="450" y1="150" x2="510" y2="210" stroke="%23ef4444" stroke-width="4" />
    <text x="480" y="240" fill="%23f87171" font-size="13" font-family="sans-serif" font-weight="bold" text-anchor="middle">NO RAMP / ELEVATOR</text>
    <text x="30" y="370" fill="%2394a3b8" font-size="13" font-family="sans-serif">Evidence: 4 steep masonry stairs without handrail or ramp access</text>
  </svg>`
};
