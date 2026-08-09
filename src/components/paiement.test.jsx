// @vitest-environment jsdom
//
// Cas pratique du domaine : un client règle la location en carte et les extras
// en espèces. On vérifie dans un vrai DOM que le choix ligne par ligne pilote
// bien la répartition, et que c'est cette répartition qui part à
// l'enregistrement — pas un mode de paiement unique.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import ReservationForm from './ReservationForm'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const INITIAL = {
  roomId: 'ch1',
  arrival: new Date(2025, 7, 20),
  departure: new Date(2025, 7, 23),
}

let container
let root
let enregistre

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  enregistre = null
  act(() =>
    root.render(
      <ReservationForm
        initial={INITIAL}
        reservations={[]}
        onSave={(values) => {
          enregistre = values
          return Promise.resolve('doc-neuf')
        }}
        onDelete={() => {}}
        onClose={() => {}}
      />
    )
  )
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function saisir(input, valeur) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(input, valeur)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function cliquer(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

const bouton = (libelle) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === libelle)

/** Les deux boutons carte/espèces du bloc n° i (0 = séjour, 1 = 1er extra). */
function toggle(i) {
  const groupe = container.querySelectorAll('.pay-toggle')[i]
  return {
    carte: groupe.querySelectorAll('.pay-option')[0],
    especes: groupe.querySelectorAll('.pay-option')[1],
  }
}

/** Texte sans espaces insécables, pour comparer les montants sereinement. */
const texte = () => container.textContent.replace(/\s/g, ' ')

describe('paiement ligne par ligne', () => {
  it('la location en carte et les extras en espèces donnent la bonne répartition', () => {
    act(() => saisir(container.querySelector('input[type="text"]'), 'Rossi'))

    // Prix du séjour : 320 €, réglé en carte (choix par défaut)
    const prix = container.querySelectorAll('input[inputmode="decimal"]')[0]
    act(() => saisir(prix, '320'))
    act(() => cliquer(toggle(0).carte))

    // Un extra à 30 €, réglé en espèces
    act(() => cliquer(bouton('+ Ajouter un extra')))
    const lignesExtra = container.querySelectorAll('.extra-row')
    expect(lignesExtra).toHaveLength(1)
    act(() => saisir(lignesExtra[0].querySelector('.extra-label'), '2 pizzas'))
    act(() => saisir(lignesExtra[0].querySelector('.extra-amount'), '30'))
    act(() => cliquer(toggle(1).especes))

    // Le récapitulatif annonce le partage, sans avoir rien enregistré
    expect(texte()).toContain('Paiement partagé')
    expect(texte()).toContain('320,00 €')
    expect(texte()).toContain('30,00 €')

    // Et c'est bien ça qui part à l'enregistrement
    act(() => cliquer(bouton('Enregistrer')))
    expect(enregistre.basePayment).toBe('cb')
    expect(enregistre.extras).toEqual([{ label: '2 pizzas', amount: 30, payment: 'especes' }])
    expect(enregistre.paymentMethod).toBe('mixte')
    expect(enregistre.total).toBe(350)
  })

  it('tout en espèces reste annoncé comme un paiement simple', () => {
    act(() => saisir(container.querySelector('input[type="text"]'), 'Petit'))
    act(() => saisir(container.querySelectorAll('input[inputmode="decimal"]')[0], '120'))
    act(() => cliquer(toggle(0).especes))

    expect(texte()).toContain('Réglé intégralement en espèces')
    expect(texte()).not.toContain('Paiement partagé')

    act(() => cliquer(bouton('Enregistrer')))
    expect(enregistre.paymentMethod).toBe('especes')
  })

  it('un nouvel extra reprend le paiement du précédent', () => {
    act(() => cliquer(bouton('+ Ajouter un extra')))
    act(() => cliquer(toggle(1).especes))
    act(() => cliquer(bouton('+ Ajouter un extra')))

    // Le second extra arrive déjà en espèces : pas d'appui inutile.
    expect(toggle(2).especes.getAttribute('aria-pressed')).toBe('true')
    expect(toggle(2).carte.getAttribute('aria-pressed')).toBe('false')
  })

  it('les boutons de paiement n’enregistrent rien tout seuls', () => {
    act(() => cliquer(toggle(0).especes))
    expect(enregistre).toBeNull()
  })
})
