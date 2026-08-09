import { PAYMENT_METHODS } from '../constants'

/**
 * Choix « carte / especes » pour UNE ligne : le sejour, ou un extra.
 *
 * Deux gros boutons plutot qu'un select : sur tablette c'est un appui au lieu
 * de trois, et on voit d'un coup d'oeil ce qui est selectionne.
 */
export default function PaymentToggle({ value, onChange, label, compact = false }) {
  return (
    <div className={'pay-toggle' + (compact ? ' is-compact' : '')} role="group" aria-label={label}>
      {PAYMENT_METHODS.map((p) => (
        <button
          key={p.value}
          type="button"
          className={'pay-option' + (value === p.value ? ' is-on' : '')}
          onClick={() => onChange(p.value)}
          aria-pressed={value === p.value}
          title={p.label}
        >
          {compact ? p.tres_court : p.short}
        </button>
      ))}
    </div>
  )
}
