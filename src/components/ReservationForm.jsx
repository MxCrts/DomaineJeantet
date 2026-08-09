import { useMemo, useRef, useState } from 'react'
import { PAYMENT_METHODS, SPOTS, SPOT_GROUPS, spotName, spotOrUnknown } from '../constants'
import { formatDateFr, fromInputValue, nights, toInputValue } from '../utils/dates'
import { formatEur, parseAmount } from '../utils/money'
import { autoTotal, conflictMessage, extrasTotal, formConflicts } from '../utils/reservations'
import SpotIcon from './SpotIcon'

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
  const [roomId, setRoomId] = useState(initial.roomId || SPOTS[0].id)
  const [arrivalStr, setArrivalStr] = useState(toInputValue(initial.arrival))
  const [departureStr, setDepartureStr] = useState(toInputValue(initial.departure))
  const [basePrice, setBasePrice] = useState(
    isEdit && initial.basePrice !== undefined ? numToInput(initial.basePrice) : ''
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

  // Id attribué par Firestore à une réservation qu'on vient de créer : à partir
  // de là elle est traitée comme une réservation existante, donc exclue du
  // contrôle de conflit.
  const [savedId, setSavedId] = useState(null)
  // Drapeau synchrone : passe à true AVANT l'écriture, sans attendre un rendu.
  // C'est lui qui neutralise le contrôle pendant que Firestore répercute le
  // document tout juste créé (onSnapshot arrive avant la fin de l'await).
  const savingRef = useRef(false)

  const arrival = fromInputValue(arrivalStr)
  const departure = fromInputValue(departureStr)
  const spot = spotOrUnknown(roomId)

  const computedTotal = autoTotal(basePrice, extras)
  const total = totalIsManual ? parseAmount(manualTotal) : computedTotal
  const totalFieldValue = totalIsManual ? manualTotal : numToInput(computedTotal)

  const nbNights = arrival && departure ? nights(arrival, departure) : 0
  const datesValides = !!arrival && !!departure && departure > arrival

  // Conflit d'occupation : BLOQUANT. Recalculé à chaque frappe, et à chaque
  // fois que la liste des réservations change (onSnapshot). Une fois
  // l'enregistrement lancé puis accepté, plus aucun conflit n'est signalé.
  const conflicts = useMemo(() => {
    if (!datesValides) return []
    return formConflicts(reservations, {
      id: initial.id,
      savedId,
      roomId,
      arrival,
      departure,
      saving: savingRef.current || busy,
    })
  }, [reservations, initial.id, savedId, roomId, arrivalStr, departureStr, datesValides, busy])

  const conflictText = conflictMessage(spotName(roomId), conflicts)
  const saveBloque = conflicts.length > 0

  // Si l'arrivée passe après le départ, on décale le départ d'une nuit :
  // évite de laisser le formulaire coincé dans un état en erreur.
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
    // Dernière vérification avant écriture : le conflit interdit d'enregistrer.
    const conflitsMaintenant = formConflicts(reservations, {
      id: initial.id,
      savedId,
      roomId,
      arrival,
      departure,
      saving: false,
    })
    if (conflitsMaintenant.length > 0) {
      setError(conflictMessage(spotName(roomId), conflitsMaintenant))
      return
    }

    // À partir d'ici l'enregistrement est accepté : on coupe le contrôle de
    // conflit AVANT d'écrire, sinon le document renvoyé par Firestore pendant
    // l'attente se retrouve comparé à lui-même.
    savingRef.current = true
    setBusy(true)
    try {
      const id = await onSave({
        id: savedId || initial.id,
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
      // Enregistrement accepté : on retient l'id attribué (la réservation ne
      // peut plus se voir elle-même), on efface toute erreur, et on ferme.
      if (id) setSavedId(id)
      setError('')
      onClose()
    } catch (err) {
      console.error(err)
      savingRef.current = false
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
      <div className={'modal' + (isEdit ? ' modal-edit' : ' modal-new')} role="dialog" aria-modal="true">
        <div className="modal-header">
          <span className="modal-icon" style={{ color: spot.color }}>
            <SpotIcon type={spot.icon} size={34} />
          </span>
          <div className="modal-heading">
            <span className="modal-mode">{isEdit ? 'Modification' : 'Création'}</span>
            <h2 className="modal-title">
              {isEdit
                ? `Modifier la réservation — ${initial.clientName || 'sans nom'}`
                : 'Nouvelle réservation'}
            </h2>
          </div>
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
              <span className="field-label">Emplacement</span>
              <div
                className="select-with-icon"
                style={{ '--spot-color': spot.color, '--spot-tint': spot.tint }}
              >
                <span className="select-icon">
                  <SpotIcon type={spot.icon} size={26} />
                </span>
                <select
                  className="field-input select-spot"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                >
                  {SPOT_GROUPS.map((g) => (
                    <optgroup key={g.id} label={g.label}>
                      {g.spots.map((s) => (
                        // La pastille colorée devant le nom : les navigateurs
                        // qui savent teinter une option le font, les autres
                        // affichent simplement le nom.
                        <option key={s.id} value={s.id} style={{ color: s.ink }}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
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
              {formatDateFr(departure)} (l’emplacement est libre le jour du départ)
            </p>
          )}

          {conflictText && <p className="alert alert-error">{conflictText}</p>}

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

            {extras.length === 0 && <p className="field-note extras-empty">Aucun extra.</p>}

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
                  className="btn btn-icon-danger extra-remove"
                  onClick={() => removeExtra(e.key)}
                  aria-label="Supprimer cet extra"
                >
                  ✕
                </button>
              </div>
            ))}

            <button className="btn btn-secondary btn-add-extra" onClick={addExtra}>
              + Ajouter un extra
            </button>
          </div>

          <div className="total-box">
            <label className="field total-field">
              <span className="field-label">Total à payer (€)</span>
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
                <span>
                  Calcul automatique : prix du séjour + extras.
                  <br />
                  Vous pouvez corriger ce montant à la main.
                </span>
              )}
            </div>
          </div>

          {error && error !== conflictText && <p className="alert alert-error">{error}</p>}
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
                className="btn btn-danger-soft"
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
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={busy || saveBloque}
              title={saveBloque ? conflictText : undefined}
            >
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
