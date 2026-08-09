// Petit drapeau francais dessine a la main, comme les icones d'emplacement :
// aucun emoji (le rendu changerait d'une tablette a l'autre), aucune image.
//
// Les deux bandes exterieures sont des chemins a coins arrondis, la bande
// blanche un simple rectangle. Le filet de contour est en `currentColor` a
// faible opacite : il se pose donc tout seul sur le bandeau vert comme sur le
// fond creme, et c'est lui qui detache la bande blanche du fond.

const BLEU = '#002395'
const ROUGE = '#ED2939'

export default function FlagFR({ size = 18, className = '' }) {
  return (
    <svg
      className={'flag-fr ' + className}
      width={size}
      height={Math.round((size * 2) / 3)}
      viewBox="0 0 18 12"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 0H1.6A1.6 1.6 0 0 0 0 1.6v8.8A1.6 1.6 0 0 0 1.6 12H6Z" fill={BLEU} />
      <rect x="6" y="0" width="6" height="12" fill="#fff" />
      <path d="M12 0h4.4A1.6 1.6 0 0 1 18 1.6v8.8a1.6 1.6 0 0 1-1.6 1.6H12Z" fill={ROUGE} />
      <rect
        x="0.35"
        y="0.35"
        width="17.3"
        height="11.3"
        rx="1.35"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="0.7"
      />
    </svg>
  )
}
