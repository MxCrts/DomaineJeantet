// Oeil dessine a la main, dans le meme trait que les icones d'emplacement :
// aucun emoji, aucune librairie. `off` barre l'oeil d'un trait.

export default function EyeIcon({ off = false, size = 26 }) {
  return (
    <svg
      className="eye-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2.2 12S6 5.6 12 5.6 21.8 12 21.8 12 18 18.4 12 18.4 2.2 12 2.2 12Z" />
      <circle cx="12" cy="12" r="3.1" />
      {off && <path d="M4.4 19.6 19.6 4.4" />}
    </svg>
  )
}
