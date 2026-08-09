import { monthLabel } from '../utils/dates'

export default function MonthNav({ year, month, onChange }) {
  function shift(delta) {
    const d = new Date(year, month + delta, 1)
    onChange(d.getFullYear(), d.getMonth())
  }

  const now = new Date()
  const isCurrent = year === now.getFullYear() && month === now.getMonth()

  return (
    <div className="month-nav">
      <button className="btn btn-nav" onClick={() => shift(-1)} aria-label="Mois précédent">
        ‹
      </button>
      <div className="month-label">{monthLabel(year, month)}</div>
      <button className="btn btn-nav" onClick={() => shift(1)} aria-label="Mois suivant">
        ›
      </button>
      {!isCurrent && (
        <button
          className="btn btn-ghost month-today"
          onClick={() => onChange(now.getFullYear(), now.getMonth())}
        >
          Mois en cours
        </button>
      )}
    </div>
  )
}
