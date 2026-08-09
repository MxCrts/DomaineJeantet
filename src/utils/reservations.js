import { parseAmount } from './money'

/** Somme des extras (tolère les montants saisis en texte). */
export function extrasTotal(extras) {
  if (!Array.isArray(extras)) return 0
  return extras.reduce((sum, e) => sum + parseAmount(e && e.amount), 0)
}

/** Total automatique = prix du séjour + extras. */
export function autoTotal(basePrice, extras) {
  return parseAmount(basePrice) + extrasTotal(extras)
}

/**
 * Deux séjours se chevauchent s'ils partagent au moins une NUIT.
 * Un départ le jour de l'arrivée du suivant n'est donc pas un chevauchement.
 */
export function overlaps(aArrival, aDeparture, bArrival, bDeparture) {
  if (!aArrival || !aDeparture || !bArrival || !bDeparture) return false
  return aArrival.getTime() < bDeparture.getTime() && bArrival.getTime() < aDeparture.getTime()
}

/** Réservations de la même chambre qui chevauchent la période donnée. */
export function findOverlapping(reservations, { id, roomId, arrival, departure }) {
  if (!roomId || !arrival || !departure) return []
  return reservations.filter(
    (r) => r.id !== id && r.roomId === roomId && overlaps(arrival, departure, r.arrival, r.departure)
  )
}

/** Règle du bilan : une réservation compte dans le mois de sa DATE D'ARRIVÉE. */
export function reservationsOfMonth(reservations, year, month) {
  return reservations.filter(
    (r) => r.arrival && r.arrival.getFullYear() === year && r.arrival.getMonth() === month
  )
}
