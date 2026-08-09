import { useMemo, useState } from 'react'
import { SPOTS, SPOT_GROUPS } from '../constants'
import {
  addDays,
  daysInMonth,
  DAY_LETTERS,
  isSameDay,
  MONTH_NAMES,
  monthLabel,
} from '../utils/dates'
import { assignLanes, blockLabel } from '../utils/reservations'
import MonthNav from './MonthNav'
import SpotIcon from './SpotIcon'

const GAP = 4 // espace en pixels autour d'un bloc dans sa ligne

// ---------------------------------------------------------------------------
// Lignes de la grille, calculees une fois pour toutes : la ligne 1 est
// l'en-tete des jours, puis pour chaque groupe une fine ligne de titre suivie
// de ses emplacements. Ajouter un emplacement dans constants.js suffit, tout
// se replace tout seul.
// ---------------------------------------------------------------------------
const ROWS = []
SPOT_GROUPS.forEach((group) => {
  ROWS.push({ kind: 'group', key: `groupe-${group.id}`, group })
  group.spots.forEach((spot, i) => {
    ROWS.push({
      kind: 'spot',
      key: spot.id,
      spot,
      lastOfGroup: i === group.spots.length - 1,
    })
  })
})
ROWS.forEach((row, i) => {
  row.gridRow = i + 2 // +2 : la ligne 1 est l'en-tete des jours
  row.lastRow = i === ROWS.length - 1
})
const ROW_OF_SPOT = new Map(ROWS.filter((r) => r.kind === 'spot').map((r) => [r.spot.id, r]))
const GRID_ROWS = ROWS.map((r) => (r.kind === 'group' ? 'var(--group-h)' : 'var(--row-h)')).join(' ')

export default function Planning({ reservations, onOpenForm }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const nbDays = daysInMonth(year, month)
  const days = useMemo(
    () => Array.from({ length: nbDays }, (_, i) => new Date(year, month, i + 1)),
    [year, month, nbDays]
  )

  // Colonne du jour : seulement si "aujourd'hui" tombe dans le mois affiche.
  const todayColumn =
    now.getFullYear() === year && now.getMonth() === month ? now.getDate() + 1 : null

  // Un bloc par réservation visible dans le mois affiché.
  // Le bloc couvre les NUITS occupées : du jour d'arrivée à la veille du départ
  // (le jour du départ, l'emplacement est de nouveau libre).
  const blocks = useMemo(() => {
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month, nbDays)
    const out = []

    SPOTS.forEach((spot) => {
      const row = ROW_OF_SPOT.get(spot.id)
      const forSpot = []
      reservations.forEach((r) => {
        if (r.roomId !== spot.id) return
        const lastNight = addDays(r.departure, -1)
        if (r.arrival > monthEnd || lastNight < monthStart) return

        const startDay = r.arrival < monthStart ? 1 : r.arrival.getDate()
        const endDay = lastNight > monthEnd ? nbDays : lastNight.getDate()
        if (endDay < startDay) return

        forSpot.push({
          reservation: r,
          spot,
          gridRow: row.gridRow,
          startDay,
          endDay,
          clippedLeft: r.arrival < monthStart,
          clippedRight: lastNight > monthEnd,
        })
      })
      // Si d'anciennes données se chevauchent, on les empile au lieu d'en
      // cacher une derrière l'autre.
      out.push(...assignLanes(forSpot))
    })
    return out
  }, [reservations, year, month, nbDays])

  // Cases occupées : pas de case vide cliquable sous un bloc.
  const occupied = useMemo(() => {
    const set = new Set()
    blocks.forEach((b) => {
      for (let d = b.startDay; d <= b.endDay; d++) set.add(`${b.spot.id}:${d}`)
    })
    return set
  }, [blocks])

  const gridStyle = {
    gridTemplateColumns: `var(--spot-col) repeat(${nbDays}, minmax(var(--day-w), 1fr))`,
    gridTemplateRows: `var(--head-h) ${GRID_ROWS}`,
  }

  // Hauteur d'un bloc dans sa ligne. Avec une seule voie (cas normal) le bloc
  // occupe toute la hauteur moins les marges ; s'il y a plusieurs voies, la
  // hauteur est divisee et le bloc est decale vers le bas de sa voie.
  function blockGeometry(lane, laneCount) {
    const h = `(var(--row-h) - ${(laneCount + 1) * GAP}px) / ${laneCount}`
    return {
      alignSelf: 'start',
      height: `calc(${h})`,
      marginTop: `calc(${lane} * (${h} + ${GAP}px) + ${GAP}px)`,
    }
  }

  return (
    <div className="planning">
      <MonthNav
        year={year}
        month={month}
        onChange={(y, m) => {
          setYear(y)
          setMonth(m)
        }}
      />

      <div className="planning-scroll">
        <div className="planning-grid" style={gridStyle}>
          {/* Colonne du jour : un voile vertical qui traverse tout le planning,
              et deux filets qui restent visibles par-dessus les blocs. */}
          {todayColumn && (
            <>
              <div
                className="today-veil"
                style={{ gridRow: '1 / -1', gridColumn: todayColumn }}
                aria-hidden="true"
              />
              <div
                className="today-rule"
                style={{ gridRow: '1 / -1', gridColumn: todayColumn }}
                aria-hidden="true"
              />
            </>
          )}

          {/* Coin haut-gauche : neutre, ce sont les bandes de groupe qui
              nomment maintenant « Emplacements » et « Hébergements ». */}
          <div className="grid-corner" style={{ gridRow: 1, gridColumn: 1 }}>
            Le domaine
          </div>

          {/* En-tête : lettre du jour, numéro, et repère du 1er du mois */}
          {days.map((d, i) => {
            const jour = d.getDay()
            return (
              <div
                key={`h${i}`}
                className={
                  'grid-head' +
                  (jour === 6 ? ' is-saturday' : '') +
                  (jour === 0 ? ' is-sunday' : '') +
                  (i === 0 ? ' is-month-start' : '') +
                  (i === nbDays - 1 ? ' is-last-col' : '') +
                  (isSameDay(d, now) ? ' is-today' : '')
                }
                style={{ gridRow: 1, gridColumn: i + 2 }}
              >
                <span className="head-letter">{DAY_LETTERS[jour]}</span>
                <span className="head-day">{d.getDate()}</span>
                {i === 0 && (
                  <span className="head-month">{MONTH_NAMES[month].slice(0, 3)}</span>
                )}
              </div>
            )
          })}

          {/* Titres de groupe : une fine bande au-dessus de chaque paquet */}
          {ROWS.filter((r) => r.kind === 'group').map((row) => (
            <div
              key={row.key}
              className="grid-group"
              style={{ gridRow: row.gridRow, gridColumn: '1 / -1' }}
            >
              <span className="grid-group-label">{row.group.label}</span>
            </div>
          ))}

          {/* Colonne des emplacements */}
          {ROWS.filter((r) => r.kind === 'spot').map((row) => (
            <div
              key={row.spot.id}
              className={
                'grid-spot' +
                (row.lastOfGroup ? ' is-last-of-group' : '') +
                (row.lastRow ? ' is-last-row' : '')
              }
              style={{
                gridRow: row.gridRow,
                gridColumn: 1,
                '--spot-color': row.spot.color,
                '--spot-tint': row.spot.tint,
                '--spot-ink': row.spot.ink,
              }}
            >
              <span className="grid-spot-icon">
                <SpotIcon type={row.spot.icon} size={30} />
              </span>
              <span className="grid-spot-name">{row.spot.name}</span>
            </div>
          ))}

          {/* Cases du calendrier. Les cases libres sont des boutons (création),
              les cases occupées de simples fonds : c'est le bloc posé par-dessus
              qui est cliquable, et il ouvre la réservation en modification. */}
          {ROWS.filter((r) => r.kind === 'spot').map((row) =>
            days.map((d, i) => {
              const jour = d.getDay()
              const className =
                'grid-cell' +
                (jour === 6 ? ' is-saturday' : '') +
                (jour === 0 ? ' is-sunday' : '') +
                (row.lastOfGroup ? ' is-last-of-group' : '') +
                (row.lastRow ? ' is-last-row' : '') +
                (i === nbDays - 1 ? ' is-last-col' : '')
              const style = { gridRow: row.gridRow, gridColumn: i + 2 }

              if (occupied.has(`${row.spot.id}:${i + 1}`)) {
                return <div key={`${row.spot.id}-${i}`} className={className} style={style} />
              }
              return (
                <button
                  key={`${row.spot.id}-${i}`}
                  className={className}
                  style={style}
                  aria-label={`${row.spot.name}, ${d.getDate()} — nouvelle réservation`}
                  onClick={() =>
                    onOpenForm({ roomId: row.spot.id, arrival: d, departure: addDays(d, 1) })
                  }
                />
              )
            })
          )}

          {/* Blocs de réservation : fond teinté, barre latérale pleine dans la
              couleur de l'emplacement, nom en foncé, icône en filigrane. */}
          {blocks.map((b) => {
            const span = b.endDay - b.startDay + 1
            const nom = b.reservation.clientName || 'sans nom'
            return (
              <button
                key={b.reservation.id}
                className={
                  'grid-block' +
                  (span === 1 ? ' is-short' : '') +
                  (b.clippedLeft ? ' clipped-left' : '') +
                  (b.clippedRight ? ' clipped-right' : '')
                }
                style={{
                  gridRow: b.gridRow,
                  gridColumn: `${b.startDay + 1} / ${b.endDay + 2}`,
                  '--spot-color': b.spot.color,
                  '--spot-tint': b.spot.tint,
                  '--spot-ink': b.spot.ink,
                  ...blockGeometry(b.lane, b.laneCount),
                }}
                onClick={() => onOpenForm(b.reservation)}
                title={`${nom} — ${b.spot.name}`}
              >
                {span >= 2 && (
                  <span className="block-mark" aria-hidden="true">
                    <SpotIcon type={b.spot.icon} size={38} />
                  </span>
                )}
                <span className="block-text">
                  {b.clippedLeft ? '‹ ' : ''}
                  {blockLabel(b.reservation.clientName, span)}
                  {b.clippedRight ? ' ›' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {blocks.length === 0 && (
        <p className="planning-empty">
          Rien de prévu en {monthLabel(year, month).toLowerCase()} — le domaine est tout à vous.
          Touchez une case pour ouvrir une réservation.
        </p>
      )}

      <p className="planning-hint">
        Touchez une case libre pour créer une réservation, ou une réservation existante pour la
        modifier. Un séjour occupe l’emplacement de la nuit d’arrivée jusqu’à la veille du départ.
      </p>
    </div>
  )
}
