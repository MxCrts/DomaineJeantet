// Test de fumee : on rend reellement les trois ecrans avec des donnees factices
// et on verifie que le HTML produit contient ce qu'on attend. Ca attrape les
// erreurs de rendu (variable inexistante, mauvaise prop) sans navigateur.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import Planning from './Planning'
import Bilan from './Bilan'
import Export from './Export'
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

  it('l’export affiche la feuille imprimable détaillée du mois en cours', () => {
    const html = renderToStaticMarkup(<Export reservations={CE_MOIS} />)
    expect(html).toContain('Domaine Jeantet — Réservations du')
    expect(html).toContain('print-sheet')
    // Une ligne par réservation, avec son détail
    expect(html).toContain('Dupont')
    expect(html).toContain('2 pizzas')
    expect(html).toContain('Carte bancaire')
    expect(html).toContain('Espèces')
    // Synthèse et totaux
    expect(html).toContain('Synthèse par emplacement')
    expect(html).toContain('TOTAL GÉNÉRAL')
    expect(html).toContain('178,00') // 58 + 120
    // Les commandes ne partent pas à l'impression
    expect(html).toContain('export-controls no-print')
    expect(html).toContain('Ce mois-ci')
    expect(html).toContain('Télécharger CSV')
    expect(html).toContain('Imprimer / PDF')
  })

  it('l’export prévient au lieu de produire un fichier vide', () => {
    const html = renderToStaticMarkup(<Export reservations={[]} />)
    expect(html).toContain('Aucune réservation du')
    expect(html).not.toContain('print-sheet')
    expect(html).toContain('disabled') // les deux boutons d'export
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

  it('le formulaire propose un moyen de paiement par ligne', () => {
    const html = renderToStaticMarkup(
      <ReservationForm
        initial={{ roomId: 'ch1', arrival: new Date(2025, 7, 20), departure: new Date(2025, 7, 21) }}
        reservations={RESERVATIONS}
        onSave={noop}
        onDelete={noop}
        onClose={noop}
      />
    )
    expect(html).toContain('Réglé en')
    expect(html).toContain('pay-toggle')
    // Plus de select global « Mode de paiement »
    expect(html).not.toContain('Mode de paiement<')
  })

  it('le formulaire affiche la répartition d’un paiement partagé', () => {
    // Location en carte, extras en espèces : le cas courant du domaine.
    const partagee = {
      id: 'm1',
      clientName: 'Rossi',
      roomId: 'ch1',
      arrival: new Date(2025, 7, 20),
      departure: new Date(2025, 7, 23),
      basePrice: 320,
      basePayment: 'cb',
      extras: [
        { label: '2 pizzas', amount: 18, payment: 'especes' },
        { label: 'Bois', amount: 12, payment: 'especes' },
      ],
      paymentMethod: 'mixte',
      total: 350,
      totalIsManual: false,
    }
    const html = renderToStaticMarkup(
      <ReservationForm
        initial={partagee}
        reservations={[partagee]}
        onSave={noop}
        onDelete={noop}
        onClose={noop}
      />
    )
    expect(html).toContain('Paiement partagé')
    expect(html).toContain('320,00')
    expect(html).toContain('30,00')
    expect(html).not.toContain('Impossible :') // ni conflit avec elle-même
  })

  it('une réservation ancienne garde son mode de paiement unique', () => {
    // Aucun champ basePayment, aucun payment sur les extras.
    const html = renderToStaticMarkup(
      <ReservationForm
        initial={{ ...RESERVATIONS[1], paymentMethod: 'especes' }}
        reservations={RESERVATIONS}
        onSave={noop}
        onDelete={noop}
        onClose={noop}
      />
    )
    expect(html).toContain('Réglé intégralement en espèces')
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
