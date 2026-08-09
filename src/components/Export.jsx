import { useMemo, useState } from 'react'
import { formatDateFr, fromInputValue, toInputValue } from '../utils/dates'
import { formatEur } from '../utils/money'
import {
  PRESETS,
  buildCsv,
  csvFileName,
  downloadCsv,
  exportRows,
  exportSummary,
  presetRange,
  rangeLabel,
} from '../utils/export'

/**
 * Export des reservations d'une periode.
 *
 * Ce qui est a l'ecran EST la feuille imprimee : le tableau ci-dessous est
 * volontairement sobre (noir sur blanc, aucune couleur d'emplacement), et la
 * feuille de style @media print se contente de masquer les commandes.
 * Aucune donnee n'est modifiee ici, on ne fait que lire.
 */
export default function Export({ reservations }) {
  const defaut = presetRange('mois-ci')

  const [preset, setPreset] = useState('mois-ci')
  const [startStr, setStartStr] = useState(toInputValue(defaut.start))
  const [endStr, setEndStr] = useState(toInputValue(defaut.end))

  const start = fromInputValue(startStr)
  const end = fromInputValue(endStr)
  const periodeValide = !!start && !!end && end >= start

  function choisirPreset(key) {
    const r = presetRange(key)
    if (!r) return
    setPreset(key)
    setStartStr(toInputValue(r.start))
    setEndStr(toInputValue(r.end))
  }

  const { rows, summary } = useMemo(() => {
    if (!periodeValide) return { rows: [], summary: null }
    const rows = exportRows(reservations, start, end)
    return { rows, summary: exportSummary(rows) }
  }, [reservations, startStr, endStr, periodeValide])

  const vide = rows.length === 0

  function telechargerCsv() {
    downloadCsv(buildCsv(rows, summary, start, end), csvFileName(start, end))
  }

  return (
    <div className="export">
      <section className="export-controls no-print">
        <div className="export-field">
          <span className="field-label">Période</span>
          <div className="preset-row">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                className={'btn btn-secondary preset' + (preset === p.key ? ' preset-active' : '')}
                onClick={() => choisirPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="export-dates">
          <label className="field">
            <span className="field-label">Du</span>
            <input
              className="field-input"
              type="date"
              value={startStr}
              onChange={(e) => {
                setStartStr(e.target.value)
                setPreset('libre')
              }}
            />
          </label>
          <label className="field">
            <span className="field-label">Au</span>
            <input
              className="field-input"
              type="date"
              value={endStr}
              onChange={(e) => {
                setEndStr(e.target.value)
                setPreset('libre')
              }}
            />
          </label>
        </div>

        <div className="export-actions">
          <button
            className="btn btn-secondary"
            onClick={() => window.print()}
            disabled={vide}
            title={vide ? 'Aucune réservation à imprimer sur cette période' : undefined}
          >
            Imprimer / PDF
          </button>
          <button className="btn btn-primary" onClick={telechargerCsv} disabled={vide}>
            Télécharger CSV
          </button>
        </div>
      </section>

      {!periodeValide && (
        <p className="alert alert-error no-print">
          La date de fin doit être après la date de début.
        </p>
      )}

      {periodeValide && vide && (
        <p className="alert alert-warning no-print">
          Aucune réservation {rangeLabel(start, end)}. Choisissez une autre période : l’export ne
          contiendrait rien.
        </p>
      )}

      {periodeValide && !vide && (
        <div className="print-sheet">
          <header className="sheet-head">
            <h1 className="sheet-title">
              Domaine Jeantet — Réservations {rangeLabel(start, end)}
            </h1>
            <p className="sheet-sub">
              {rows.length} réservation{rows.length > 1 ? 's' : ''} · {summary.nights} nuit
              {summary.nights > 1 ? 's' : ''} · édité le {formatDateFr(new Date())}
            </p>
          </header>

          <table className="sheet-table">
            <thead>
              <tr>
                <th>Emplacement</th>
                <th>Nom du client</th>
                <th>Arrivée</th>
                <th>Départ</th>
                <th className="num">Nuits</th>
                <th className="num">Séjour</th>
                <th>Détail des extras</th>
                <th className="num">Extras</th>
                <th>Paiement</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.spot}</td>
                  <td>{r.clientName}</td>
                  <td className="nowrap">{formatDateFr(r.arrival)}</td>
                  <td className="nowrap">{formatDateFr(r.departure)}</td>
                  <td className="num">{r.nights}</td>
                  <td className="num">{formatEur(r.basePrice)}</td>
                  <td className="extras-cell">{r.extrasDetail || '—'}</td>
                  <td className="num">{formatEur(r.extrasTotal)}</td>
                  <td>{r.payment}</td>
                  <td className="num strong">{formatEur(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="sheet-summaries">
            <table className="sheet-table sheet-recap">
              <thead>
                <tr>
                  <th colSpan={4}>Synthèse par emplacement</th>
                </tr>
                <tr>
                  <th>Emplacement</th>
                  <th className="num">Réservations</th>
                  <th className="num">Nuits</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.spots.map((s) => (
                  <tr key={s.roomId}>
                    <td>{s.spot}</td>
                    <td className="num">{s.count}</td>
                    <td className="num">{s.nights}</td>
                    <td className="num strong">{formatEur(s.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="strong">TOTAL GÉNÉRAL</td>
                  <td className="num strong">{summary.count}</td>
                  <td className="num strong">{summary.nights}</td>
                  <td className="num strong">{formatEur(summary.total)}</td>
                </tr>
              </tfoot>
            </table>

            <table className="sheet-table sheet-recap">
              <thead>
                <tr>
                  <th colSpan={2}>Encaissements</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Carte bancaire</td>
                  <td className="num">{formatEur(summary.cb)}</td>
                </tr>
                <tr>
                  <td>Espèces</td>
                  <td className="num">{formatEur(summary.especes)}</td>
                </tr>
                <tr>
                  <td>Dont extras</td>
                  <td className="num">{formatEur(summary.extras)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td className="strong">TOTAL GÉNÉRAL</td>
                  <td className="num strong">{formatEur(summary.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <p className="bilan-hint no-print">
        La période filtre sur la <strong>date d’arrivée</strong>, comme le bilan : une réservation
        est comptée en entier dans la période où elle commence. Le CSV s’ouvre directement dans
        Excel (séparateur point-virgule, accents conservés).
      </p>
    </div>
  )
}
