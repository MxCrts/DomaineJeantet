import { useCallback, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'

import { auth, db } from './firebase'
import { toDate } from './utils/dates'
import Login from './components/Login'
import Planning from './components/Planning'
import Bilan from './components/Bilan'
import Export from './components/Export'
import ReservationForm from './components/ReservationForm'

const RESERVATIONS = 'reservations'

const TABS = [
  { key: 'planning', label: 'Planning' },
  { key: 'bilan', label: 'Bilan' },
  { key: 'export', label: 'Export' },
]

export default function App() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  const [reservations, setReservations] = useState([])
  const [dataError, setDataError] = useState('')
  const [dataReady, setDataReady] = useState(false)

  const [tab, setTab] = useState('planning')
  // null = formulaire fermé. Sinon : la réservation à éditer, ou un pré-remplissage.
  const [editing, setEditing] = useState(null)

  // --- Authentification ----------------------------------------------------
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
    })
  }, [])

  // --- Données -------------------------------------------------------------
  // Le volume est très faible (quelques centaines de réservations au maximum) :
  // on charge tout en une fois et on filtre par mois côté navigateur. C'est le
  // plus simple et ça évite tout index composite Firestore.
  useEffect(() => {
    if (!user) {
      setReservations([])
      setDataReady(false)
      return
    }
    const q = query(collection(db, RESERVATIONS), orderBy('arrival'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            clientName: data.clientName || '',
            roomId: data.roomId || '',
            arrival: toDate(data.arrival),
            departure: toDate(data.departure),
            basePrice: Number(data.basePrice) || 0,
            extras: Array.isArray(data.extras) ? data.extras : [],
            paymentMethod: data.paymentMethod || 'cb',
            total: Number(data.total) || 0,
            totalIsManual: !!data.totalIsManual,
          }
        })
        setReservations(list.filter((r) => r.arrival && r.departure))
        setDataError('')
        setDataReady(true)
      },
      (err) => {
        console.error(err)
        setDataError(
          'Impossible de charger les réservations. Vérifiez la connexion Internet, ' +
            'puis rechargez la page.'
        )
        setDataReady(true)
      }
    )
    return unsub
  }, [user])

  // --- Écritures -----------------------------------------------------------
  // Renvoie l'id du document écrit (celui qui existait, ou celui que Firestore
  // vient d'attribuer). Le formulaire s'en sert pour ne jamais se comparer à
  // elle-même la réservation qu'il vient de créer.
  const saveReservation = useCallback(async (values) => {
    const payload = {
      clientName: values.clientName,
      roomId: values.roomId,
      arrival: Timestamp.fromDate(values.arrival),
      departure: Timestamp.fromDate(values.departure),
      basePrice: values.basePrice,
      extras: values.extras,
      paymentMethod: values.paymentMethod,
      total: values.total,
      totalIsManual: values.totalIsManual,
      updatedAt: serverTimestamp(),
    }
    if (values.id) {
      await updateDoc(doc(db, RESERVATIONS, values.id), payload)
      return values.id
    }
    const ref = await addDoc(collection(db, RESERVATIONS), {
      ...payload,
      createdAt: serverTimestamp(),
    })
    return ref.id
  }, [])

  const removeReservation = useCallback(async (id) => {
    await deleteDoc(doc(db, RESERVATIONS, id))
  }, [])

  // --- Rendu ---------------------------------------------------------------
  if (!authReady) {
    return <div className="app-loading">Chargement…</div>
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="app">
      <header className="app-header no-print">
        <div className="app-brand">Domaine Jeantet</div>

        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={'tab' + (tab === t.key ? ' tab-active' : '')}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <button className="btn btn-ghost" onClick={() => signOut(auth)}>
          Déconnexion
        </button>
      </header>

      {dataError && <p className="alert alert-error app-alert no-print">{dataError}</p>}

      <main className="app-main">
        {!dataReady ? (
          <div className="app-loading">Chargement des réservations…</div>
        ) : tab === 'planning' ? (
          <Planning reservations={reservations} onOpenForm={setEditing} />
        ) : tab === 'bilan' ? (
          <Bilan reservations={reservations} />
        ) : (
          <Export reservations={reservations} />
        )}
      </main>

      {editing && (
        <ReservationForm
          initial={editing}
          reservations={reservations}
          onSave={saveReservation}
          onDelete={removeReservation}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
