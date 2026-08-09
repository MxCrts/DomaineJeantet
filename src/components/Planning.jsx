import { useMemo, useState } from 'react'
import { ROOMS } from '../constants'
import { addDays, daysInMonth, DAY_LETTERS, isSameDay, isWeekend } from '../utils/dates'
import MonthNav from './MonthNav'

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
  // Convention : le bloc couvre les NUITS occupées, donc du jour d'arrivée
  // jusqu'à la veille du départ (le jour du départ, la chambre est libre).
  const blocks = useMemo(() => {
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month, nbDays)
    const out = []

    reservations.forEach((r) => {
      const rowIndex = ROOMS.findIndex((room) => room.id === r.roomId)
      if (rowIndex === -1) return
      const lastNight = addDays(r.departure, -1)
      if (r.arrival > monthEnd || lastNight < monthStart) return

      const startDay = r.arrival < monthStart ? 1 : r.arrival.getDate()
      const endDay = lastNight > monthEnd ? nbDays : lastNight.getDate()
      if (endDay < startDay) return

      out.push({
        reservation: r,
        rowIndex,
        startDay,
        endDay,
        clippedLeft: r.arrival < monthStart,
        clippedRight: lastNight > monthEnd,
      })
    })
    return out
  }, [reservations, year, month, nbDays])

  // Cases occupées : on n'affiche pas de case vide cliquable en dessous d'un bloc.
  const occupied = useMemo(() => {
    const set = new Set()
    blocks.forEach((b) => {
      for (let d = b.startDay; d <= b.endDay; d++) set.add(`${b.rowIndex}:${d}`)
    })
    return set
  }, [blocks])

  const gridStyle = {
    gridTemplateColumns: `var(--room-col) repeat(${nbDays}, minmax(var(--day-w), 1fr))`,
    gridTemplateRows: `var(--head-h) repeat(${ROOMS.length}, var(--row-h))`,
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
            Chambres
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
              <div className="head-day">{d.getDate()}</div>
              <div className="head-letter">{DAY_LETTERS[d.getDay()]}</div>
            </div>
          ))}

          {/* Colonne des chambres */}
          {ROOMS.map((room, r) => (
            <div
              key={room.id}
              className="grid-room"
              style={{ gridRow: r + 2, gridColumn: 1, borderLeftColor: room.color }}
            >
              {room.name}
            </div>
          ))}

          {/* Cases vides cliquables */}
          {ROOMS.map((room, r) =>
            days.map((d, i) => {
              if (occupied.has(`${r}:${i + 1}`)) return null
              return (
                <button
                  key={`${room.id}-${i}`}
                  className={
                    'grid-cell' +
                    (isWeekend(d) ? ' is-weekend' : '') +
                    (isSameDay(d, now) ? ' is-today' : '')
                  }
                  style={{ gridRow: r + 2, gridColumn: i + 2 }}
                  aria-label={`${room.name}, ${d.getDate()} — ajouter une réservation`}
                  onClick={() =>
                    onOpenForm({ roomId: room.id, arrival: d, departure: addDays(d, 1) })
                  }
                />
              )
            })
          )}

          {/* Blocs de réservation */}
          {blocks.map((b) => {
            const room = ROOMS[b.rowIndex]
            return (
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
                  backgroundColor: room.color,
                }}
                onClick={() => onOpenForm(b.reservation)}
                title={b.reservation.clientName}
              >
                <span className="block-text">
                  {b.clippedLeft ? '‹ ' : ''}
                  {b.reservation.clientName || '(sans nom)'}
                  {b.clippedRight ? ' ›' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <p className="planning-hint">
        Touchez une case vide pour créer une réservation, ou une réservation existante pour la
        modifier. Un séjour occupe la chambre de la nuit d’arrivée jusqu’à la veille du départ.
      </p>
    </div>
  )
}
