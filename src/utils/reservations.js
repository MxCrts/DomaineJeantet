import { parseAmount } from './money'
import { formatDateFr } from './dates'

/** Somme des extras (tolère les montants saisis en texte). */
export function extrasTotal(extras) {
  if (!Array.isArray(extras)) return 0
  return extras.reduce((sum, e) => sum + parseAmount(e && e.amount), 0)
}

/** Total automatique = prix du séjour + extras. */
export function autoTotal(basePrice, extras) {
  return parseAmount(basePrice) + extrasTotal(extras)
}

// ---------------------------------------------------------------------------
// Chevauchements
// ---------------------------------------------------------------------------

/**
 * Numéro de jour absolu : nombre de jours écoulés depuis le 1er janvier 1970.
 *
 * On ne garde QUE l'année, le mois et le jour, et on les recompose en UTC.
 * Résultat : un entier. Plus d'heures, plus de minutes, plus de fuseau horaire,
 * plus de piège d'heure d'été — deux dates du même jour donnent forcément le
 * même entier, et la comparaison de deux jours est une comparaison d'entiers.
 */
export function dayNumber(date) {
  if (!date || typeof date.getFullYear !== 'function') return NaN
  const y = date.getFullYear()
  if (Number.isNaN(y)) return NaN
  return Math.round(Date.UTC(y, date.getMonth(), date.getDate()) / 86400000)
}

/**
 * Deux séjours se chevauchent-ils ?
 *
 * Un séjour est l'intervalle SEMI-OUVERT [arrivée, départ) : la nuit d'arrivée
 * est occupée, le jour du départ est libre (convention hôtelière).
 *
 *   chevauchement  <=>  arrivéeA < départB  ET  arrivéeB < départA
 *
 * Exemples (existant 11 -> 12) :
 *   8 -> 11  : PAS de chevauchement (on part le 11, l'autre arrive le 11)
 *   8 -> 12  : chevauchement (la nuit du 11 est prise deux fois)
 */
export function overlaps(arrivalA, departureA, arrivalB, departureB) {
  const a1 = dayNumber(arrivalA)
  const a2 = dayNumber(departureA)
  const b1 = dayNumber(arrivalB)
  const b2 = dayNumber(departureB)
  if (Number.isNaN(a1) || Number.isNaN(a2) || Number.isNaN(b1) || Number.isNaN(b2)) return false
  // Un séjour de durée nulle ou négative n'occupe aucune nuit.
  if (a2 <= a1 || b2 <= b1) return false
  return a1 < b2 && b1 < a2
}

/**
 * Réservations du MÊME emplacement qui chevauchent la période donnée.
 * `id` est celui de la réservation en cours d'édition ou de création : elle est
 * exclue du test (une réservation ne peut jamais être en conflit avec
 * elle-même). En création, cet id est inconnu jusqu'à l'écriture, puis connu
 * dès que Firestore l'a attribué : voir formConflicts ci-dessous.
 */
export function findConflicts(reservations, { id, roomId, arrival, departure }) {
  if (!roomId || !arrival || !departure) return []
  return reservations.filter(
    (r) =>
      r.id !== id &&
      r.roomId === roomId &&
      overlaps(arrival, departure, r.arrival, r.departure)
  )
}

/**
 * Conflits à SIGNALER dans le formulaire.
 *
 * Différence avec findConflicts : on tient compte de l'enregistrement en cours.
 * Firestore renvoie la réservation qu'on vient d'écrire par onSnapshot (echo
 * local, avant même la réponse du serveur). Sans précaution, le formulaire
 * comparait cette réservation toute fraîche à elle-même et affichait
 * « Impossible : ... est déjà réservé ... » alors que l'enregistrement venait
 * de réussir. Deux garde-fous, l'un couvrant l'autre :
 *
 *   1. `saving` : pendant l'écriture, on ne signale plus rien — l'id n'est pas
 *      encore connu, aucune comparaison n'est fiable.
 *   2. `savedId` : dès que Firestore a attribué l'id, il remplace celui de
 *      l'édition et la réservation s'exclut elle-même comme en modification.
 */
export function formConflicts(
  reservations,
  { id, savedId, roomId, arrival, departure, saving }
) {
  if (saving) return []
  return findConflicts(reservations, {
    id: savedId || id || null,
    roomId,
    arrival,
    departure,
  })
}

/** Message d'erreur explicite listant les conflits trouvés. */
export function conflictMessage(spotLabel, conflicts) {
  if (!conflicts || conflicts.length === 0) return ''
  const details = conflicts
    .map(
      (c) =>
        `du ${formatDateFr(c.arrival)} au ${formatDateFr(c.departure)} (${
          c.clientName || 'sans nom'
        })`
    )
    .join(', et ')
  return `Impossible : ${spotLabel} est déjà réservé ${details}.`
}

/**
 * Texte affiché dans un bloc du planning, selon sa largeur en nuits.
 *
 * Un bloc d'une seule nuit fait la largeur d'une colonne (~40 px) : un nom
 * entier n'y tient pas et se ferait couper n'importe où. On y met donc les
 * initiales (« Jean Dupont » -> « JD ») ou les deux premières lettres
 * (« Dupont » -> « Du »). Le nom complet reste dans l'infobulle du bloc.
 */
export function blockLabel(clientName, span) {
  const name = String(clientName || '').trim()
  if (!name) return span >= 2 ? '(sans nom)' : '·'
  if (span >= 2) return name
  const mots = name.split(/\s+/)
  if (mots.length >= 2) return (mots[0][0] + mots[1][0]).toUpperCase()
  return name.length <= 3 ? name : name.slice(0, 2)
}

/** Règle du bilan : une réservation compte dans le mois de sa DATE D'ARRIVÉE. */
export function reservationsOfMonth(reservations, year, month) {
  return reservations.filter(
    (r) => r.arrival && r.arrival.getFullYear() === year && r.arrival.getMonth() === month
  )
}

/**
 * Répartit les réservations d'un même emplacement sur des "voies" horizontales
 * pour qu'aucune ne soit cachée derrière une autre.
 *
 * En principe les conflits sont désormais bloqués à la saisie, mais des données
 * anciennes peuvent encore se chevaucher : on les affiche l'une sous l'autre
 * plutôt que d'en masquer une (c'est ce qui donnait l'impression qu'une
 * réservation en "remplaçait" une autre).
 */
export function assignLanes(items) {
  const lanesEnd = [] // dernier jour occupé (exclu) de chaque voie
  const sorted = [...items].sort((a, b) => a.startDay - b.startDay || a.endDay - b.endDay)
  sorted.forEach((item) => {
    let lane = lanesEnd.findIndex((end) => end <= item.startDay)
    if (lane === -1) {
      lane = lanesEnd.length
      lanesEnd.push(0)
    }
    lanesEnd[lane] = item.endDay + 1
    item.lane = lane
  })
  const laneCount = Math.max(1, lanesEnd.length)
  sorted.forEach((item) => {
    item.laneCount = laneCount
  })
  return sorted
}
