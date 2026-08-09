/** Accepte "12,50" comme "12.50". Renvoie 0 si vide / invalide. */
export function parseAmount(value) {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return isFinite(value) ? value : 0
  const cleaned = String(value).replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return 0
  const n = Number(cleaned)
  return isFinite(n) ? n : 0
}

/** 1234.5 -> "1 234,50 EUR" (avec le vrai symbole euro). */
export function formatEur(n) {
  const value = typeof n === 'number' && isFinite(n) ? n : 0
  return value.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
