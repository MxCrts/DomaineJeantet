import { useMemo, useState } from 'react'
import { SPOTS } from '../constants'
import { formatEur } from '../utils/money'
import { extrasTotal, reservationsOfMonth } from '../utils/reservations'
import MonthNav from './MonthNav'
import SpotIcon from './SpotIcon'

export default function Bilan({ reservations }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { cards, grand } = useMemo(() => {
    const ofMonth = reservationsOfMonth(reservations, year, month)

    const cards = SPOTS.map((spot) => {
      const list = ofMonth.filter((r) => r.roomId === spot.id)
      return {
        spot,
        count: list.length,
        extras: list.reduce((s, r) => s + extrasTotal(r.extras), 0),
        total: list.reduce((s, r) => s + (Number(r.total) || 0), 0),
      }
    })

    const somme = (predicate) =>
      ofMonth.filter(predicate).reduce((s, r) => s + (Number(r.total) || 0), 0)

    const total = cards.reduce((s, c) => s + c.total, 0)
    const cb = somme((r) => r.paymentMethod === 'cb')
    const especes = somme((r) => r.paymentMethod === 'especes')

    return {
      cards,
      grand: {
        count: ofMonth.length,
        extras: cards.reduce((s, c) => s + c.extras, 0),
        total,
        cb,
        especes,
        partCb: total > 0 ? Math.round((cb / total) * 100) : 0,
      },
    }
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

      <section className="grand-card">
        <div className="grand-main">
          <span className="grand-label">Total général du mois</span>
          <span className="grand-value">{formatEur(grand.total)}</span>
          <span className="grand-sub">
            {grand.count} réservation{grand.count > 1 ? 's' : ''} · dont{' '}
            {formatEur(grand.extras)} d’extras
          </span>
        </div>

        <div className="grand-split">
          <span className="split-title">Encaissements</span>
          <div className="split-bar" role="presentation">
            <span className="split-bar-cb" style={{ width: `${grand.partCb}%` }} />
          </div>
          <div className="split-legend">
            <span className="split-item">
              <span className="split-dot dot-cb" />
              Carte bancaire
              <strong>{formatEur(grand.cb)}</strong>
            </span>
            <span className="split-item">
              <span className="split-dot dot-especes" />
              Espèces
              <strong>{formatEur(grand.especes)}</strong>
            </span>
          </div>
        </div>
      </section>

      <div className="spot-cards">
        {cards.map((c) => (
          <article
            key={c.spot.id}
            className={'spot-card' + (c.count === 0 ? ' is-empty' : '')}
            style={{ '--spot-color': c.spot.color }}
          >
            <header className="spot-card-head">
              <span className="spot-card-icon">
                <SpotIcon type={c.spot.icon} size={30} />
              </span>
              <h3 className="spot-card-name">{c.spot.name}</h3>
            </header>

            <p className="spot-card-total">{formatEur(c.total)}</p>

            <dl className="spot-card-detail">
              <div>
                <dt>Réservations</dt>
                <dd>{c.count}</dd>
              </div>
              <div>
                <dt>Dont extras</dt>
                <dd>{formatEur(c.extras)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <p className="bilan-hint">
        Une réservation est comptée dans le mois de sa date d’arrivée, pour la totalité de son
        montant (pas de répartition entre deux mois).
      </p>
    </div>
  )
}
