import { useMemo, useState } from 'react'
import { SPOT_GROUPS } from '../constants'
import { formatEur } from '../utils/money'
import { extrasTotal, paymentSplit, reservationsOfMonth } from '../utils/reservations'
import MonthNav from './MonthNav'
import SpotIcon from './SpotIcon'

export default function Bilan({ reservations }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const { groups, cards, grand } = useMemo(() => {
    const ofMonth = reservationsOfMonth(reservations, year, month)

    const carte = (spot) => {
      const list = ofMonth.filter((r) => r.roomId === spot.id)
      return {
        spot,
        count: list.length,
        extras: list.reduce((s, r) => s + extrasTotal(r.extras), 0),
        total: list.reduce((s, r) => s + (Number(r.total) || 0), 0),
      }
    }

    const groups = SPOT_GROUPS.map((g) => ({ ...g, cards: g.spots.map(carte) }))
    const cards = groups.flatMap((g) => g.cards)

    // Répartition ligne par ligne : une réservation dont la location est payée
    // en carte et les extras en espèces alimente les deux colonnes.
    const encaisse = ofMonth.reduce(
      (acc, r) => {
        const part = paymentSplit(r)
        acc.cb += part.cb
        acc.especes += part.especes
        return acc
      },
      { cb: 0, especes: 0 }
    )

    const total = cards.reduce((s, c) => s + c.total, 0)
    const cb = encaisse.cb
    const especes = encaisse.especes

    return {
      groups,
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

      {groups.map((g) => (
        <section className="bilan-group" key={g.id}>
          <h2 className="bilan-group-title">
            <span>{g.label}</span>
            <span className="bilan-group-total">
              {formatEur(g.cards.reduce((s, c) => s + c.total, 0))}
            </span>
          </h2>

          <div className="spot-cards">
            {g.cards.map((c) => (
              <article
                key={c.spot.id}
                className={'spot-card' + (c.count === 0 ? ' is-empty' : '')}
                style={{
                  '--spot-color': c.spot.color,
                  '--spot-tint': c.spot.tint,
                  '--spot-ink': c.spot.ink,
                }}
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
        </section>
      ))}

      <p className="bilan-hint">
        Une réservation est comptée dans le mois de sa date d’arrivée, pour la totalité de son
        montant (pas de répartition entre deux mois).
      </p>
    </div>
  )
}
