import { useMemo, useState } from 'react'
import { PAYMENT_METHODS, ROOMS, roomName } from '../constants'
import { formatDateFr, fromInputValue, nights, toInputValue } from '../utils/dates'
import { formatEur, parseAmount } from '../utils/money'
import { autoTotal, extrasTotal, findOverlapping } from '../utils/reservations'

/** Nombre -> texte de saisie français ("12.5" -> "12,5"). */
function numToInput(n) {
  if (n === null || n === undefined || n === '') return ''
  const rounded = Math.round(Number(n) * 100) / 100
  if (!isFinite(rounded)) return ''
  return String(rounded).replace('.', ',')
}

let extraKeySeq = 0
function makeExtra(label, amount) {
  extraKeySeq += 1
  return { key: `e${extraKeySeq}`, label: label || '', amount: numToInput(amount) }
}

export default function ReservationForm({ initial, reservations, onSave, onDelete, onClose }) {
  const isEdit = !!initial.id

  const [clientName, setClientName] = useState(initial.clientName || '')
  const [roomId, setRoomId] = useState(initial.roomId || ROOMS[0].id)
  const [arrivalStr, setArrivalStr] = useState(toInputValue(initial.arrival))
  const [departureStr, setDepartureStr] = useState(toInputValue(initial.departure))
  const [basePrice, setBasePrice] = useState(
    initial.basePrice !== undefined && isEdit ? numToInput(initial.basePrice) : ''
  )
  const [extras, setExtras] = useState(() =>
    (initial.extras || []).map((e) => makeExtra(e.label, e.amount))
  )
  const [paymentMethod, setPaymentMethod] = useState(initial.paymentMethod || 'cb')
  const [totalIsManual, setTotalIsManual] = useState(!!initial.totalIsManual)
  const [manualTotal, setManualTotal] = useState(
    initial.totalIsManual ? numToInput(initial.total) : ''
  )

  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const arrival = fromInputValue(arrivalStr)
  const departure = fromInputValue(departureStr)

  const computedTotal = autoTotal(basePrice, extras)
  const total = totalIsManual ? parseAmount(manualTotal) : computedTotal
  const totalFieldValue = totalIsManual ? manualTotal : numToInput(computedTotal)

  const nbNights = arrival && departure ? nights(arrival, departure) : 0

  // Avertissement non bloquant : chevauchement sur la même chambre.
  const conflicts = useMemo(() => {
    if (!arrival || !departure || departure <= arrival) return []
    return findOverlapping(reservations, { id: initial.id, roomId, arrival, departure })
  }, [reservations, initial.id, roomId, arrivalStr, departureStr])

  // Si on recule la date d'arrivee apres le depart, on decale le depart d'une
  // nuit : evite de laisser le formulaire dans un etat en erreur.
  function changeArrival(value) {
    setArrivalStr(value)
    const a = fromInputValue(value)
    const d = fromInputValue(departureStr)
    if (a && (!d || d <= a)) {
      setDepartureStr(toInputValue(new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1)))
    }
  }

  // --- Extras --------------------------------------------------------------
  function updateExtra(key, patch) {
    setExtras((list) => list.map((e) => (e.key === key ? { ...e, ...patch } : e)))
  }
  function addExtra() {
    setExtras((list) => [...list, makeExtra('', '')])
  }
  function removeExtra(key) {
    setExtras((list) => list.filter((e) => e.key !== key))
  }

  // --- Enregistrement ------------------------------------------------------
  async function handleSave() {
    setError('')

    if (!clientName.trim()) {
      setError('Merci d’indiquer le nom du client.')
      return
    }
    if (!arrival || !departure) {
      setError('Merci d’indiquer la date d’arrivée et la date de départ.')
      return
    }
    if (departure <= arrival) {
      setError('La date de départ doit être après la date d’arrivée.')
      return
    }

    setBusy(true)
    try {
      await onSave({
        id: initial.id,
        clientName: clientName.trim(),
        roomId,
        arrival,
        departure,
        basePrice: parseAmount(basePrice),
        extras: extras
          .filter((e) => e.label.trim() !== '' || parseAmount(e.amount) !== 0)
          .map((e) => ({ label: e.label.trim(), amount: parseAmount(e.amount) })),
        paymentMethod,
        total,
        totalIsManual,
      })
      onClose()
    } catch (err) {
      console.error(err)
      setError('Enregistrement impossible. Vérifiez la connexion Internet puis réessayez.')
      setBusy(false)
    }
  }

  async function handleDelete() {
    setError('')
    setBusy(true)
    try {
      await onDelete(initial.id)
      onClose()
    } catch (err) {
      console.error(err)
      setError('Suppression impossible. Vérifiez la connexion Internet puis réessayez.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2 className="modal-title">
            {isEdit ? 'Modifier la réservation' : 'Nouvelle réservation'}
          </h2>
          <button className="btn btn-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span className="field-label">Nom du client</span>
            <input
              className="field-input"
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              autoFocus={!isEdit}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Chambre</span>
              <select
                className="field-input"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                {ROOMS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">Mode de paiement</span>
              <select
                className="field-input"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Date d’arrivée</span>
              <input
                className="field-input"
                type="date"
                value={arrivalStr}
                onChange={(e) => changeArrival(e.target.value)}
              />
            </label>

            <label className="field">
              <span className="field-label">Date de départ</span>
              <input
                className="field-input"
                type="date"
                value={departureStr}
                onChange={(e) => setDepartureStr(e.target.value)}
              />
            </label>
          </div>

          {nbNights > 0 && (
            <p className="field-note">
              {nbNights} nuit{nbNights > 1 ? 's' : ''} — du {formatDateFr(arrival)} au{' '}
              {formatDateFr(departure)}
            </p>
          )}

          {conflicts.length > 0 && (
            <p className="alert alert-warning">
              Attention : chevauche la réservation de{' '}
              {conflicts.map((c) => c.clientName || '(sans nom)').join(', ')} (
              {roomName(roomId)}).
            </p>
          )}

          <label className="field">
            <span className="field-label">Prix du séjour (€)</span>
            <input
              className="field-input"
              type="text"
              inputMode="decimal"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
            />
          </label>

          <div className="extras">
            <div className="extras-head">
              <span className="field-label">Extras</span>
              {extras.length > 0 && (
                <span className="extras-sum">Sous-total : {formatEur(extrasTotal(extras))}</span>
              )}
            </div>

            {extras.length === 0 && <p className="field-note">Aucun extra.</p>}

            {extras.map((e) => (
              <div className="extra-row" key={e.key}>
                <input
                  className="field-input extra-label"
                  type="text"
                  placeholder="Ex : 2 pizzas"
                  value={e.label}
                  onChange={(ev) => updateExtra(e.key, { label: ev.target.value })}
                />
                <input
                  className="field-input extra-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="€"
                  value={e.amount}
                  onChange={(ev) => updateExtra(e.key, { amount: ev.target.value })}
                />
                <button
                  className="btn btn-danger-ghost extra-remove"
                  onClick={() => removeExtra(e.key)}
                  aria-label="Supprimer cet extra"
                >
                  ✕
                </button>
              </div>
            ))}

            <button className="btn btn-secondary" onClick={addExtra}>
              + Ajouter un extra
            </button>
          </div>

          <div className="total-box">
            <label className="field total-field">
              <span className="field-label">Total (€)</span>
              <input
                className="field-input total-input"
                type="text"
                inputMode="decimal"
                value={totalFieldValue}
                onChange={(e) => {
                  setTotalIsManual(true)
                  setManualTotal(e.target.value)
                }}
              />
            </label>
            <div className="total-note">
              {totalIsManual ? (
                <>
                  <span className="total-manual">Total saisi à la main</span>
                  <button
                    className="btn btn-link"
                    onClick={() => {
                      setTotalIsManual(false)
                      setManualTotal('')
                    }}
                  >
                    Revenir au calcul automatique ({formatEur(computedTotal)})
                  </button>
                </>
              ) : (
                <span>Calculé automatiquement : prix du séjour + extras.</span>
              )}
            </div>
          </div>

          {error && <p className="alert alert-error">{error}</p>}
        </div>

        <div className="modal-footer">
          {isEdit &&
            (confirmDelete ? (
              <div className="confirm-delete">
                <span>Supprimer définitivement ?</span>
                <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>
                  Oui, supprimer
                </button>
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                  Non
                </button>
              </div>
            ) : (
              <button
                className="btn btn-danger-ghost"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                Supprimer
              </button>
            ))}

          <div className="footer-right">
            <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Annuler
            </button>
            <button className="btn btn-primary" onClick={handleSave} disabled={busy}>
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
