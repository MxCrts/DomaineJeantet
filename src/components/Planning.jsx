import { useMemo, useState } from 'react'
import { SPOTS } from '../constants'
import { addDays, daysInMonth, DAY_LETTERS, isSameDay, isWeekend } from '../utils/dates'
import { assignLanes } from '../utils/reservations'
import MonthNav from './MonthNav'
import SpotIcon from './SpotIcon'

const GAP = 4 // espace en pixels autour d'un bloc dans sa ligne

export default function Planning({ reservations, onOpenForm }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const nbDays = daysInMonth(year, month)
  const days = useMemo(
    () => Array.from({ length: nbDays }, (_, i) => new Date(year, month, i + 1)),
    [year, month, nbDays]
  )

  // Un bloc par réservation visible dans le mois affiché.
  // Le bloc couvre les NUITS occupées : du jour d'arrivée à la veille du départ
  // (le jour du départ, l'emplacement est de nouveau libre).
  const blocks = useMemo(() => {
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month, nbDays)
    const out = []

    SPOTS.forEach((spot, rowIndex) => {
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
          rowIndex,
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
      for (let d = b.startDay; d <= b.endDay; d++) set.add(`${b.rowIndex}:${d}`)
    })
    return set
  }, [blocks])

  const gridStyle = {
    gridTemplateColumns: `var(--spot-col) repeat(${nbDays}, minmax(var(--day-w), 1fr))`,
    gridTemplateRows: `var(--head-h) repeat(${SPOTS.length}, var(--row-h))`,
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
          {/* Coin haut-gauche */}
          <div className="grid-corner" style={{ gridRow: 1, gridColumn: 1 }}>
            Emplacements
          </div>

          {/* En-tête : numéros de jours */}
          {days.map((d, i) => (
            <div
              key={`h${i}`}
              className={
                'grid-head' +
                (isWeekend(d) ? ' is-weekend' : '') +
                (isSameDay(d, now) ? ' is-today' : '')
              }
              style={{ gridRow: 1, gridColumn: i + 2 }}
            >
              <div className="head-letter">{DAY_LETTERS[d.getDay()]}</div>
              <div className="head-day">{d.getDate()}</div>
            </div>
          ))}

          {/* Colonne des emplacements */}
          {SPOTS.map((spot, r) => (
            <div
              key={spot.id}
              className="grid-spot"
              style={{ gridRow: r + 2, gridColumn: 1, '--spot-color': spot.color }}
            >
              <span className="grid-spot-icon">
                <SpotIcon type={spot.icon} size={30} />
              </span>
              <span className="grid-spot-name">{spot.name}</span>
            </div>
          ))}

          {/* Cases du calendrier. Les cases libres sont des boutons (création),
              les cases occupées de simples fonds : c'est le bloc posé par-dessus
              qui est cliquable, et il ouvre la réservation en modification. */}
          {SPOTS.map((spot, r) =>
            days.map((d, i) => {
              const className =
                'grid-cell' +
                (isWeekend(d) ? ' is-weekend' : '') +
                (isSameDay(d, now) ? ' is-today' : '')
              const style = { gridRow: r + 2, gridColumn: i + 2 }

              if (occupied.has(`${r}:${i + 1}`)) {
                return <div key={`${spot.id}-${i}`} className={className} style={style} />
              }
              return (
                <button
                  key={`${spot.id}-${i}`}
                  className={className}
                  style={style}
                  aria-label={`${spot.name}, ${d.getDate()} — nouvelle réservation`}
                  onClick={() =>
                    onOpenForm({ roomId: spot.id, arrival: d, departure: addDays(d, 1) })
                  }
                />
              )
            })
          )}

          {/* Blocs de réservation */}
          {blocks.map((b) => (
            <button
              key={b.reservation.id}
              className={
                'grid-block' +
                (b.clippedLeft ? ' clipped-left' : '') +
                (b.clippedRight ? ' clipped-right' : '')
              }
              style={{
                gridRow: b.rowIndex + 2,
                gridColumn: `${b.startDay + 1} / ${b.endDay + 2}`,
                backgroundColor: b.spot.color,
                ...blockGeometry(b.lane, b.laneCount),
              }}
              onClick={() => onOpenForm(b.reservation)}
              title={`${b.reservation.clientName} — ${b.spot.name}`}
            >
              <span className="block-text">
                {b.clippedLeft ? '‹ ' : ''}
                {b.reservation.clientName || '(sans nom)'}
                {b.clippedRight ? ' ›' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="planning-hint">
        Touchez une case libre pour créer une réservation, ou une réservation existante pour la
        modifier. Un séjour occupe l’emplacement de la nuit d’arrivée jusqu’à la veille du départ.
      </p>
    </div>
  )
}
