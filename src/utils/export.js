// ---------------------------------------------------------------------------
// Export des reservations : selection d'une periode, mise a plat des donnees,
// et generation du CSV. Tout est ici, sans aucune librairie.
//
// Regle de periode : on filtre sur la DATE D'ARRIVEE, exactement comme le
// bilan. Une reservation appartient a la periode ou elle commence, pour la
// totalite de son montant.
// ---------------------------------------------------------------------------

import { SPOTS, paymentLabel, spotName } from '../constants'
import { formatDateFr, nights, toInputValue } from './dates'
import { formatEur, parseAmount } from './money'
import { dayNumber, extrasTotal } from './reservations'

/** Rang d'affichage d'un emplacement (ordre de constants.js). */
function spotOrder(roomId) {
  const i = SPOTS.findIndex((s) => s.id === roomId)
  return i === -1 ? SPOTS.length : i
}

// ---------------------------------------------------------------------------
// Periodes
// ---------------------------------------------------------------------------

export const PRESETS = [
  { key: 'mois-ci', label: 'Ce mois-ci' },
  { key: 'mois-dernier', label: 'Mois dernier' },
  { key: 'semaine', label: 'Cette semaine' },
]

/**
 * Bornes d'un raccourci de periode, incluses toutes les deux.
 * La semaine va du lundi au dimanche (convention francaise).
 */
export function presetRange(key, today = new Date()) {
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()

  if (key === 'mois-ci') {
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) }
  }
  if (key === 'mois-dernier') {
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) }
  }
  if (key === 'semaine') {
    const jour = today.getDay() // 0 = dimanche
    const reculLundi = jour === 0 ? 6 : jour - 1
    return { start: new Date(y, m, d - reculLundi), end: new Date(y, m, d - reculLundi + 6) }
  }
  return null
}

/** Libelle « du 01/08/2025 au 31/08/2025 ». */
export function rangeLabel(start, end) {
  if (!start || !end) return ''
  return `du ${formatDateFr(start)} au ${formatDateFr(end)}`
}

/** Reservations dont la date d'arrivee tombe dans [start, end], bornes incluses. */
export function reservationsInRange(reservations, start, end) {
  const a = dayNumber(start)
  const b = dayNumber(end)
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return []
  return reservations.filter((r) => {
    const j = dayNumber(r.arrival)
    return !Number.isNaN(j) && j >= a && j <= b
  })
}

// ---------------------------------------------------------------------------
// Mise a plat
// ---------------------------------------------------------------------------

/** Detail des extras sur une ligne : « 2 pizzas 18,00 € ; Vin 15,00 € ». */
export function extrasDetail(extras) {
  if (!Array.isArray(extras) || extras.length === 0) return ''
  return extras
    .map((e) => {
      const label = String((e && e.label) || '').trim()
      const montant = formatEur(parseAmount(e && e.amount))
      return label ? `${label} ${montant}` : montant
    })
    .join(' ; ')
}

/**
 * Une ligne par reservation, triee par date d'arrivee puis par emplacement
 * (et par nom du client a egalite, pour que l'ordre soit toujours le meme).
 */
export function exportRows(reservations, start, end) {
  return reservationsInRange(reservations, start, end)
    .slice()
    .sort(
      (x, y) =>
        dayNumber(x.arrival) - dayNumber(y.arrival) ||
        spotOrder(x.roomId) - spotOrder(y.roomId) ||
        String(x.clientName || '').localeCompare(String(y.clientName || ''), 'fr')
    )
    .map((r) => {
      const extras = Array.isArray(r.extras) ? r.extras : []
      return {
        id: r.id,
        roomId: r.roomId,
        spot: spotName(r.roomId),
        clientName: r.clientName || '(sans nom)',
        arrival: r.arrival,
        departure: r.departure,
        nights: nights(r.arrival, r.departure),
        basePrice: Number(r.basePrice) || 0,
        extras,
        extrasDetail: extrasDetail(extras),
        extrasTotal: extrasTotal(extras),
        paymentMethod: r.paymentMethod,
        payment: paymentLabel(r.paymentMethod) || '—',
        total: Number(r.total) || 0,
      }
    })
}

/** Synthese par emplacement + totaux generaux de la periode. */
export function exportSummary(rows) {
  const parSpot = new Map()
  rows.forEach((r) => {
    const c = parSpot.get(r.roomId) || {
      roomId: r.roomId,
      spot: r.spot,
      count: 0,
      nights: 0,
      extras: 0,
      total: 0,
    }
    c.count += 1
    c.nights += r.nights
    c.extras += r.extrasTotal
    c.total += r.total
    parSpot.set(r.roomId, c)
  })

  const somme = (predicate) =>
    rows.filter(predicate).reduce((s, r) => s + r.total, 0)

  return {
    spots: [...parSpot.values()].sort((a, b) => spotOrder(a.roomId) - spotOrder(b.roomId)),
    count: rows.length,
    nights: rows.reduce((s, r) => s + r.nights, 0),
    extras: rows.reduce((s, r) => s + r.extrasTotal, 0),
    total: rows.reduce((s, r) => s + r.total, 0),
    cb: somme((r) => r.paymentMethod === 'cb'),
    especes: somme((r) => r.paymentMethod === 'especes'),
  }
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

const SEP = ';' // convention Excel francais
const EOL = '\r\n'

/** Echappe une cellule : guillemets seulement si necessaire. */
function cell(value) {
  const s = value === null || value === undefined ? '' : String(value)
  return /["\r\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** 1234.5 -> « 1234,50 » : Excel en francais y lit un nombre, pas du texte. */
export function csvAmount(n) {
  const v = typeof n === 'number' && isFinite(n) ? n : 0
  return v.toFixed(2).replace('.', ',')
}

export const CSV_HEADER = [
  'Emplacement',
  'Nom du client',
  'Date d’arrivée',
  'Date de départ',
  'Nuits',
  'Prix du séjour',
  'Détail des extras',
  'Total extras',
  'Mode de paiement',
  'Total',
]

/** Contenu complet du fichier CSV (sans le BOM, ajoute au telechargement). */
export function buildCsv(rows, summary, start, end) {
  const lignes = []
  const ligne = (cells) => lignes.push(cells.map(cell).join(SEP))

  ligne([`Domaine Jeantet — Réservations ${rangeLabel(start, end)}`])
  ligne([])
  ligne(CSV_HEADER)

  rows.forEach((r) => {
    ligne([
      r.spot,
      r.clientName,
      formatDateFr(r.arrival),
      formatDateFr(r.departure),
      r.nights,
      csvAmount(r.basePrice),
      r.extrasDetail,
      csvAmount(r.extrasTotal),
      r.payment,
      csvAmount(r.total),
    ])
  })

  ligne([])
  ligne(['Synthèse par emplacement'])
  ligne(['Emplacement', 'Réservations', 'Nuits', 'Dont extras', 'Total'])
  summary.spots.forEach((s) => {
    ligne([s.spot, s.count, s.nights, csvAmount(s.extras), csvAmount(s.total)])
  })

  ligne([])
  ligne([
    'TOTAL GÉNÉRAL',
    summary.count,
    summary.nights,
    csvAmount(summary.extras),
    csvAmount(summary.total),
  ])
  ligne(['Dont carte bancaire', '', '', '', csvAmount(summary.cb)])
  ligne(['Dont espèces', '', '', '', csvAmount(summary.especes)])

  return lignes.join(EOL) + EOL
}

/** reservations_domaine-jeantet_2025-08-01_2025-08-31.csv */
export function csvFileName(start, end) {
  return `reservations_domaine-jeantet_${toInputValue(start)}_${toInputValue(end)}.csv`
}

/** BOM UTF-8 : sans lui, Excel lit « rÃ©servation » au lieu de « réservation ». */
export const BOM = '\ufeff'

/** Telechargement cote navigateur, sans passer par un serveur. */
export function downloadCsv(contenu, nomFichier) {
  const blob = new Blob([BOM + contenu], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  URL.revokeObjectURL(url)
}
