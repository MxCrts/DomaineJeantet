import { useMemo, useState } from 'react'
import { ROOMS } from '../constants'
import { formatEur } from '../utils/money'
import { extrasTotal, reservationsOfMonth } from '../utils/reservations'
import MonthNav from './MonthNav'

export default function Bilan({ reservations }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { rows, grand } = useMemo(() => {
    const ofMonth = reservationsOfMonth(reservations, year, month)

    const rows = ROOMS.map((room) => {
      const list = ofMonth.filter((r) => r.roomId === room.id)
      return {
        room,
        count: list.length,
        extras: list.reduce((s, r) => s + extrasTotal(r.extras), 0),
        total: list.reduce((s, r) => s + (Number(r.total) || 0), 0),
      }
    })

    const grand = {
      count: rows.reduce((s, r) => s + r.count, 0),
      extras: rows.reduce((s, r) => s + r.extras, 0),
      total: rows.reduce((s, r) => s + r.total, 0),
    }

    return { rows, grand }
  }, [reservations, year, month])

  return (
    <div className="bilan">
      <MonthNav
        year={year}
        month={month}
        onChange={(y, m) => {
          setYear(y)
          setMonth(m)
        }}
      />

      <div className="bilan-card">
        <table className="bilan-table">
          <thead>
            <tr>
              <th className="col-room">Chambre</th>
              <th className="col-num">Réservations</th>
              <th className="col-num">Dont extras</th>
              <th className="col-num">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.room.id}>
                <td className="col-room">
                  <span className="room-dot" style={{ backgroundColor: row.room.color }} />
                  {row.room.name}
                </td>
                <td className="col-num">{row.count}</td>
                <td className="col-num">{formatEur(row.extras)}</td>
                <td className="col-num col-total">{formatEur(row.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="col-room">Toutes chambres</td>
              <td className="col-num">{grand.count}</td>
              <td className="col-num">{formatEur(grand.extras)}</td>
              <td className="col-num col-total">{formatEur(grand.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="bilan-hint">
        Une réservation est comptée dans le mois de sa date d’arrivée, pour la totalité de son
        montant (pas de répartition entre deux mois).
      </p>
    </div>
  )
}
