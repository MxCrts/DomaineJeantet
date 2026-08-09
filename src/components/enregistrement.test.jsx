// @vitest-environment jsdom
//
// Reproduction du bug constate en production :
//   on cree une reservation sur des dates totalement libres, on enregistre,
//   et le message « Impossible : ... est deja reserve ... » s'affiche quand
//   meme, en citant la reservation qu'on vient de creer.
//
// La cause : Firestore renvoie le document tout juste ecrit par onSnapshot
// (echo local) AVANT que l'ecriture soit confirmee. Le formulaire, encore
// ouvert, comparait donc cette reservation toute neuve... a elle-meme.
//
// Le test rejoue exactement cet enchainement, dans un vrai DOM, avec une
// ecriture volontairement lente pour observer la fenetre ou le bug se
// produisait.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useState } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import ReservationForm from './ReservationForm'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const EXISTANTE = {
  id: 'r1',
  clientName: 'Dupont',
  roomId: 'ch1',
  arrival: new Date(2025, 7, 11),
  departure: new Date(2025, 7, 12),
  basePrice: 40,
  extras: [],
  paymentMethod: 'cb',
  total: 40,
  totalIsManual: false,
}

// Dates libres : le 20 -> 22 aout, loin de la reservation existante.
const NOUVELLE = { roomId: 'ch1', arrival: new Date(2025, 7, 20), departure: new Date(2025, 7, 22) }

let finirEcriture // resout la promesse d'ecriture, quand le test le decide

/**
 * Mini-App : detient la liste des reservations, comme le fait App.jsx avec
 * onSnapshot, et ferme la modale quand le formulaire le demande.
 */
function Ecran() {
  const [reservations, setReservations] = useState([EXISTANTE])
  const [ouvert, setOuvert] = useState(true)

  function onSave(values) {
    // Firestore : le document apparait immediatement dans la liste locale.
    setReservations((liste) => [...liste, { ...values, id: 'doc-neuf' }])
    // ... mais l'ecriture, elle, met un moment a etre confirmee.
    return new Promise((resolve) => {
      finirEcriture = () => resolve('doc-neuf')
    })
  }

  if (!ouvert) return <p className="ferme">Modale fermée</p>
  return (
    <ReservationForm
      initial={NOUVELLE}
      reservations={reservations}
      onSave={onSave}
      onDelete={() => {}}
      onClose={() => setOuvert(false)}
    />
  )
}

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

/** Saisit une valeur dans un input controle par React. */
function saisir(input, valeur) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, valeur)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function bouton(libelle) {
  return [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === libelle)
}

describe('enregistrement d’une création sur des dates libres', () => {
  it('n’affiche jamais de conflit avec la réservation qu’on vient de créer', async () => {
    act(() => root.render(<Ecran />))

    // Aucun conflit au depart : les dates sont libres.
    expect(container.textContent).not.toContain('Impossible :')

    saisir(container.querySelector('input[type="text"]'), 'Durand')
    act(() => {})

    const enregistrer = bouton('Enregistrer')
    expect(enregistrer.disabled).toBe(false)

    // Clic : l'ecriture part, et la liste recoit aussitot le document cree.
    act(() => {
      enregistrer.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    // C'est ICI que le faux message apparaissait. La modale est encore
    // ouverte (l'ecriture n'est pas confirmee) et la liste contient deja la
    // reservation toute neuve.
    expect(container.querySelector('.modal')).not.toBeNull()
    expect(container.textContent).not.toContain('Impossible :')

    // Confirmation de l'ecriture : la modale se ferme, toujours sans message.
    await act(async () => {
      finirEcriture()
    })

    expect(container.querySelector('.modal')).toBeNull()
    expect(container.querySelector('.ferme')).not.toBeNull()
    expect(document.body.textContent).not.toContain('Impossible :')
  })

  it('bloque toujours un vrai conflit', () => {
    // 8 -> 12 aout sur Chene, alors que Dupont occupe la nuit du 11.
    function EcranEnConflit() {
      return (
        <ReservationForm
          initial={{ roomId: 'ch1', arrival: new Date(2025, 7, 8), departure: new Date(2025, 7, 12) }}
          reservations={[EXISTANTE]}
          onSave={() => Promise.resolve('x')}
          onDelete={() => {}}
          onClose={() => {}}
        />
      )
    }
    act(() => root.render(<EcranEnConflit />))

    expect(container.textContent).toContain('Impossible : Chêne est déjà réservé')
    expect(bouton('Enregistrer').disabled).toBe(true)
  })
})
