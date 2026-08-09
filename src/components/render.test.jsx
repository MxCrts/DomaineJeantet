// Test de fumee : on rend reellement les trois ecrans avec des donnees factices
// et on verifie que le HTML produit contient ce qu'on attend. Ca attrape les
// erreurs de rendu (variable inexistante, mauvaise prop) sans navigateur.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Planning from './Planning'
import Bilan from './Bilan'
import ReservationForm from './ReservationForm'

// Reservations datees en aout 2025 : servent aux tests du formulaire, qui ne
// dependent pas du mois affiche.
const RESERVATIONS = [
  {
    id: 'r1',
    clientName: 'Dupont',
    roomId: 'ch1',
    arrival: new Date(2025, 7, 11),
    departure: new Date(2025, 7, 12),
    basePrice: 40,
    extras: [{ label: '2 pizzas', amount: 18 }],
    paymentMethod: 'cb',
    total: 58,
    totalIsManual: false,
  },
  {
    id: 'r2',
    clientName: 'Martin',
    roomId: 'ch6',
    arrival: new Date(2025, 7, 3),
    departure: new Date(2025, 7, 6),
    basePrice: 120,
    extras: [],
    paymentMethod: 'especes',
    total: 120,
    totalIsManual: false,
  },
]

// Planning et bilan s'ouvrent sur le MOIS COURANT : les memes reservations,
// replacees dans le mois en cours, quel que soit le jour ou tourne le test.
const NOW = new Date()
const CE_MOIS = RESERVATIONS.map((r) => ({
  ...r,
  arrival: new Date(NOW.getFullYear(), NOW.getMonth(), r.arrival.getDate()),
  departure: new Date(NOW.getFullYear(), NOW.getMonth(), r.departure.getDate()),
}))

const noop = () => {}

describe('rendu des écrans', () => {
  it('le planning affiche les emplacements et les réservations', () => {
    const html = renderToStaticMarkup(<Planning reservations={CE_MOIS} onOpenForm={noop} />)
    expect(html).toContain('Emplacements')
    expect(html).toContain('Chêne')
    expect(html).toContain('Caravane')
    expect(html).toContain('Érable')
    expect(html).toContain('Sunset')
    expect(html).toContain('Hangar')
    expect(html).toContain('La Bulle')
    expect(html).toContain('Dupont')
    expect(html).toContain('Martin')
    expect(html).toContain('<svg') // icônes inline
    expect(html).not.toContain('chambre')
    // La réservation Dupont (11 -> 12) occupe une seule nuit : colonne du 11
    expect(html).toContain('grid-column:12 / 13')
    // Martin (3 -> 6) occupe trois nuits : du 3 au 5 inclus
    expect(html).toContain('grid-column:4 / 7')
  })

  it('le planning groupe les lignes et pose les couleurs des emplacements', () => {
    const html = renderToStaticMarkup(<Planning reservations={CE_MOIS} onOpenForm={noop} />)
    // Deux bandes de groupe, dans l'ordre
    expect(html.indexOf('Emplacements')).toBeLessThan(html.indexOf('Hébergements'))
    expect(html).toContain('grid-group-label')
    // Fond teinté + barre latérale : la couleur de l'emplacement est posée en
    // variable CSS sur le bloc, plus en couleur de fond saturée.
    expect(html).toContain('--spot-color:#2F6B3C')
    expect(html).toContain('--spot-tint:#DCE9DD')
    expect(html).not.toContain('background-color:#2F6B3C')
  })

  it('un séjour d’une seule nuit est réduit aux initiales, jamais tronqué au hasard', () => {
    const html = renderToStaticMarkup(<Planning reservations={CE_MOIS} onOpenForm={noop} />)
    // Dupont occupe la seule nuit du 11 : bloc étroit -> "Du", nom complet
    // conservé dans l'infobulle.
    expect(html).toContain('title="Dupont — Chêne"')
    expect(html).toContain('grid-block is-short')
    expect(html).toContain('>Du</span>')
    // Martin tient sur trois nuits : son nom s'affiche en entier.
    expect(html).toContain('>Martin</span>')
  })

  it('le planning annonce joliment un mois sans réservation', () => {
    const html = renderToStaticMarkup(<Planning reservations={[]} onOpenForm={noop} />)
    expect(html).toContain('planning-empty')
    expect(html).toContain('le domaine est tout à vous')
  })

  it('le bilan affiche le total général, la répartition et une carte par emplacement', () => {
    const html = renderToStaticMarkup(<Bilan reservations={CE_MOIS} />)
    expect(html).toContain('Total général du mois')
    expect(html).toContain('Carte bancaire')
    expect(html).toContain('Espèces')
    expect(html).toContain('La Bulle')
    expect(html).toContain('178,00') // 58 + 120
    expect(html).toContain('2 réservations')
  })

  it('le bilan regroupe les cartes sous les deux titres', () => {
    const html = renderToStaticMarkup(<Bilan reservations={CE_MOIS} />)
    expect(html).toContain('bilan-group-title')
    expect(html).toContain('Emplacements')
    expect(html).toContain('Hébergements')
    // Sous-total du groupe « Hébergements » : les 120 € de La Bulle
    expect(html).toContain('120,00')
  })

  it('le formulaire distingue création et modification', () => {
    const creation = renderToStaticMarkup(
      <ReservationForm
        initial={{ roomId: 'ch1', arrival: new Date(2025, 7, 20), departure: new Date(2025, 7, 21) }}
        reservations={RESERVATIONS}
        onSave={noop}
        onDelete={noop}
        onClose={noop}
      />
    )
    expect(creation).toContain('Nouvelle réservation')
    expect(creation).toContain('Emplacement')
    expect(creation).not.toContain('Impossible :')
    // Le select est groupé
    expect(creation).toContain('<optgroup label="Emplacements">')
    expect(creation).toContain('<optgroup label="Hébergements">')

    const edition = renderToStaticMarkup(
      <ReservationForm
        initial={RESERVATIONS[0]}
        reservations={RESERVATIONS}
        onSave={noop}
        onDelete={noop}
        onClose={noop}
      />
    )
    expect(edition).toContain('Modifier la réservation — Dupont')
    // Une réservation n'est pas en conflit avec elle-même
    expect(edition).not.toContain('Impossible :')
  })

  it('le formulaire bloque et explique un conflit d’occupation', () => {
    // 8 -> 12 août sur Chêne, alors que Dupont occupe la nuit du 11
    const html = renderToStaticMarkup(
      <ReservationForm
        initial={{ roomId: 'ch1', arrival: new Date(2025, 7, 8), departure: new Date(2025, 7, 12) }}
        reservations={RESERVATIONS}
        onSave={noop}
        onDelete={noop}
        onClose={noop}
      />
    )
    expect(html).toContain('Impossible : Chêne est déjà réservé du 11/08/2025 au 12/08/2025 (Dupont).')
    expect(html).toContain('disabled') // bouton Enregistrer désactivé
  })

  it('le formulaire autorise 8 -> 11 face à un existant 11 -> 12', () => {
    const html = renderToStaticMarkup(
      <ReservationForm
        initial={{ roomId: 'ch1', arrival: new Date(2025, 7, 8), departure: new Date(2025, 7, 11) }}
        reservations={RESERVATIONS}
        onSave={noop}
        onDelete={noop}
        onClose={noop}
      />
    )
    expect(html).not.toContain('Impossible :')
    expect(html).toContain('3 nuits')
  })
})
