// @vitest-environment jsdom
//
// Ecran de connexion : le bouton « voir le mot de passe » et le garde-fou sur
// les espaces parasites. Aucune connexion n'est tentee ici, on ne touche pas
// au formulaire au-dela de la saisie.
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import Login from './Login'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let container
let root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<Login />))
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

const champMotDePasse = () => container.querySelector('.password-field .field-input')
const oeil = () => container.querySelector('.btn-reveal')

describe('voir le mot de passe', () => {
  it('le mot de passe est masqué au départ', () => {
    expect(champMotDePasse().type).toBe('password')
    expect(oeil().getAttribute('aria-label')).toBe('Voir le mot de passe')
  })

  it('l’œil affiche puis masque à nouveau le mot de passe', () => {
    act(() => saisir(champMotDePasse(), 'Secret2025'))

    act(() => oeil().dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(champMotDePasse().type).toBe('text')
    expect(champMotDePasse().value).toBe('Secret2025')
    expect(oeil().getAttribute('aria-label')).toBe('Masquer le mot de passe')
    expect(oeil().getAttribute('aria-pressed')).toBe('true')

    act(() => oeil().dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(champMotDePasse().type).toBe('password')
  })

  it('n’envoie pas le formulaire quand on touche l’œil', () => {
    // type="button" : sans lui, l'appui declencherait une tentative de connexion.
    expect(oeil().getAttribute('type')).toBe('button')
  })
})

describe('espace parasite', () => {
  it('signale une espace en fin de mot de passe', () => {
    act(() => saisir(champMotDePasse(), 'Secret2025 '))
    expect(container.textContent).toContain('commence ou se termine par une espace')
  })

  it('signale une espace en début de mot de passe', () => {
    act(() => saisir(champMotDePasse(), ' Secret2025'))
    expect(container.textContent).toContain('commence ou se termine par une espace')
  })

  it('ne dit rien pour un mot de passe normal, même avec une espace au milieu', () => {
    act(() => saisir(champMotDePasse(), 'mon mot de passe'))
    expect(container.textContent).not.toContain('commence ou se termine par une espace')
  })
})

describe('saisie de l’adresse e-mail', () => {
  it('désactive les corrections automatiques du clavier tactile', () => {
    const email = container.querySelector('input[type="email"]')
    expect(email.getAttribute('autocapitalize')).toBe('none')
    expect(email.getAttribute('autocorrect')).toBe('off')
    expect(email.getAttribute('spellcheck')).toBe('false')
    // Le champ mot de passe aussi : certains claviers Android capitalisent.
    expect(champMotDePasse().getAttribute('autocapitalize')).toBe('none')
    expect(champMotDePasse().getAttribute('autocorrect')).toBe('off')
  })
})
