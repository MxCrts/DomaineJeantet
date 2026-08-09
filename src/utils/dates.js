// Utilitaires de dates - tout est manipule en heure locale, a minuit.

export const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

// getDay() : 0 = dimanche ... 6 = samedi
export const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

/** Convertit un Timestamp Firestore / Date / string en objet Date (minuit local). */
export function toDate(value) {
  if (!value) return null
  let d
  if (typeof value.toDate === 'function') d = value.toDate()
  else if (value instanceof Date) d = value
  else d = new Date(value)
  if (isNaN(d.getTime())) return null
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/** Date -> "AAAA-MM-JJ" (valeur d'un <input type="date">). */
export function toInputValue(date) {
  if (!date) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** "AAAA-MM-JJ" -> Date (minuit local). */
export function fromInputValue(str) {
  if (!str) return null
  const parts = str.split('-')
  if (parts.length !== 3) return null
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return isNaN(d.getTime()) ? null : d
}

export function addDays(date, n) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

export function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

export function isWeekend(date) {
  const d = date.getDay()
  return d === 0 || d === 6
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Nombre de nuits entre deux dates. */
export function nights(arrival, departure) {
  const ms = departure.getTime() - arrival.getTime()
  return Math.round(ms / 86400000)
}

export function formatDateFr(date) {
  if (!date) return ''
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${date.getFullYear()}`
}

export function monthLabel(year, month) {
  return `${MONTH_NAMES[month]} ${year}`
}
