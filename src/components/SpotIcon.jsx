// Icones dessinees a la main en SVG inline : aucune librairie, aucun emoji.
// Elles heritent de la couleur du texte (stroke="currentColor"), il suffit donc
// de poser une `color` sur le parent pour les teinter.

const SHAPES = {
  // Van / camping-car
  van: (
    <>
      <path d="M2 17V8.5A2.5 2.5 0 0 1 4.5 6H20l6 4.5h3a1 1 0 0 1 1 1V17" />
      <path d="M2 17h4.4M11.6 17h8.8M25.6 17H30" />
      <circle cx="9" cy="17" r="2.6" />
      <circle cx="23" cy="17" r="2.6" />
      <rect x="5.5" y="8.8" width="7" height="4.6" rx="1.1" />
    </>
  ),
  // Caravane tractee
  caravan: (
    <>
      <path d="M5 17V8.5A2.5 2.5 0 0 1 7.5 6h17A2.5 2.5 0 0 1 27 8.5V17" />
      <path d="M5 13.2 1 16.2" />
      <path d="M5 17h2.4M12.6 17H27" />
      <circle cx="10" cy="17" r="2.6" />
      <rect x="8.5" y="9" width="7.5" height="4.6" rx="1.1" />
      <path d="M19.5 9.4h4.2" />
    </>
  ),
  // Bulle (logement insolite)
  bubble: (
    <>
      <path d="M3 21h26" />
      <circle cx="16" cy="13" r="8" />
      <path d="M13 21v-3.6a3 3 0 0 1 6 0V21" />
      <path d="M11.4 8.6a6.2 6.2 0 0 0-2.5 3.8" />
    </>
  ),
}

export default function SpotIcon({ type = 'van', size = 28, className = '' }) {
  return (
    <svg
      className={'spot-icon ' + className}
      viewBox="0 0 32 24"
      width={size}
      height={Math.round(size * 0.75)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {SHAPES[type] || SHAPES.van}
    </svg>
  )
}
