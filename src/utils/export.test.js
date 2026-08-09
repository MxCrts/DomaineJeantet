import { describe, it, expect } from 'vitest'
import {
  BOM,
  buildCsv,
  csvAmount,
  csvFileName,
  exportRows,
  exportSummary,
  extrasDetail,
  presetRange,
  rangeLabel,
  reservationsInRange,
} from './export'

/** Raccourci : d(2025, 8, 11) = 11 août 2025 (mois en clair, pas en index). */
function d(year, month, day) {
  return new Date(year, month - 1, day)
}

const RESAS = [
  {
    id: 'r1',
    clientName: 'Dupont',
    roomId: 'ch1', // Chêne
    arrival: d(2025, 8, 11),
    departure: d(2025, 8, 13),
    basePrice: 40,
    extras: [
      { label: '2 pizzas', amount: 18 },
      { label: 'Bouteille de vin', amount: 15 },
    ],
    paymentMethod: 'cb',
    total: 73,
  },
  {
    id: 'r2',
    clientName: 'Martin',
    roomId: 'ch6', // La Bulle
    arrival: d(2025, 8, 3),
    departure: d(2025, 8, 6),
    basePrice: 120,
    extras: [],
    paymentMethod: 'especes',
    total: 120,
  },
  {
    id: 'r3',
    clientName: 'Bernard',
    roomId: 'ch4', // Sunset
    arrival: d(2025, 8, 11), // même jour que Dupont : départage par emplacement
    departure: d(2025, 8, 12),
    basePrice: 35,
    extras: [{ label: 'Bois', amount: 5 }],
    paymentMethod: 'cb',
    total: 40,
  },
  {
    id: 'r4',
    clientName: 'Hors période',
    roomId: 'ch1',
    arrival: d(2025, 9, 2),
    departure: d(2025, 9, 4),
    basePrice: 60,
    extras: [],
    paymentMethod: 'cb',
    total: 60,
  },
]

const AOUT = { start: d(2025, 8, 1), end: d(2025, 8, 31) }

describe('presetRange', () => {
  it('« ce mois-ci » va du 1er au dernier jour du mois', () => {
    const r = presetRange('mois-ci', d(2025, 8, 14))
    expect(r.start).toEqual(d(2025, 8, 1))
    expect(r.end).toEqual(d(2025, 8, 31))
  })

  it('« mois dernier » recule d’un mois, y compris en janvier', () => {
    const r = presetRange('mois-dernier', d(2025, 8, 14))
    expect(r.start).toEqual(d(2025, 7, 1))
    expect(r.end).toEqual(d(2025, 7, 31))

    const janvier = presetRange('mois-dernier', d(2025, 1, 9))
    expect(janvier.start).toEqual(d(2024, 12, 1))
    expect(janvier.end).toEqual(d(2024, 12, 31))
  })

  it('« cette semaine » va du lundi au dimanche', () => {
    // Le 14 août 2025 est un jeudi
    const jeudi = presetRange('semaine', d(2025, 8, 14))
    expect(jeudi.start).toEqual(d(2025, 8, 11)) // lundi
    expect(jeudi.end).toEqual(d(2025, 8, 17)) // dimanche

    // Un dimanche appartient à la semaine qui vient de s'écouler
    const dimanche = presetRange('semaine', d(2025, 8, 17))
    expect(dimanche.start).toEqual(d(2025, 8, 11))
    expect(dimanche.end).toEqual(d(2025, 8, 17))
  })

  it('renvoie null pour un raccourci inconnu', () => {
    expect(presetRange('n’importe quoi')).toBeNull()
  })
})

describe('reservationsInRange', () => {
  it('filtre sur la date d’arrivée, bornes incluses', () => {
    const found = reservationsInRange(RESAS, AOUT.start, AOUT.end)
    expect(found.map((r) => r.id).sort()).toEqual(['r1', 'r2', 'r3'])
  })

  it('inclut une arrivée pile sur une borne', () => {
    expect(reservationsInRange(RESAS, d(2025, 8, 11), d(2025, 8, 11))).toHaveLength(2)
    expect(reservationsInRange(RESAS, d(2025, 8, 3), d(2025, 8, 3))).toHaveLength(1)
  })

  it('ignore un séjour qui traverse la période sans y commencer', () => {
    // Martin arrive le 3 : une période démarrant le 4 ne le prend pas.
    const found = reservationsInRange(RESAS, d(2025, 8, 4), d(2025, 8, 5))
    expect(found).toHaveLength(0)
  })

  it('renvoie une liste vide si la période est à l’envers', () => {
    expect(reservationsInRange(RESAS, d(2025, 8, 31), d(2025, 8, 1))).toHaveLength(0)
  })
})

describe('exportRows', () => {
  const rows = exportRows(RESAS, AOUT.start, AOUT.end)

  it('trie par date d’arrivée puis par emplacement', () => {
    // Martin arrive le 3. Dupont et Bernard arrivent tous deux le 11 : c'est
    // l'ordre des emplacements qui les départage (Chêne avant Sunset).
    expect(rows.map((r) => r.clientName)).toEqual(['Martin', 'Dupont', 'Bernard'])
    expect(rows[1].spot).toBe('Chêne')
    expect(rows[2].spot).toBe('Sunset')
  })

  it('détaille chaque réservation', () => {
    const dupont = rows.find((r) => r.clientName === 'Dupont')
    expect(dupont.spot).toBe('Chêne')
    expect(dupont.nights).toBe(2)
    expect(dupont.basePrice).toBe(40)
    expect(dupont.extrasTotal).toBe(33)
    expect(dupont.payment).toBe('Carte bancaire')
    expect(dupont.total).toBe(73)
  })

  it('écrit le détail des extras en clair', () => {
    const detail = rows.find((r) => r.clientName === 'Dupont').extrasDetail
    expect(detail).toContain('2 pizzas')
    expect(detail).toContain('18,00')
    expect(detail).toContain('Bouteille de vin')
    expect(detail).toContain(' ; ')
    expect(extrasDetail([])).toBe('')
  })

  it('remplace un nom vide par une mention explicite', () => {
    const [sansNom] = exportRows(
      [{ ...RESAS[0], id: 'x', clientName: '' }],
      AOUT.start,
      AOUT.end
    )
    expect(sansNom.clientName).toBe('(sans nom)')
  })
})

describe('exportSummary', () => {
  const summary = exportSummary(exportRows(RESAS, AOUT.start, AOUT.end))

  it('résume par emplacement, dans l’ordre d’affichage', () => {
    expect(summary.spots.map((s) => s.spot)).toEqual(['Chêne', 'Sunset', 'La Bulle'])
    expect(summary.spots[0].count).toBe(1)
    expect(summary.spots[0].total).toBe(73)
  })

  it('totalise la période et la répartition des encaissements', () => {
    expect(summary.count).toBe(3)
    expect(summary.total).toBe(233) // 73 + 120 + 40
    expect(summary.extras).toBe(38) // 33 + 5
    expect(summary.nights).toBe(6) // 2 + 3 + 1
    expect(summary.cb).toBe(113) // Dupont + Bernard
    expect(summary.especes).toBe(120) // Martin
    expect(summary.cb + summary.especes).toBe(summary.total)
  })
})

describe('CSV', () => {
  const rows = exportRows(RESAS, AOUT.start, AOUT.end)
  const csv = buildCsv(rows, exportSummary(rows), AOUT.start, AOUT.end)
  const lignes = csv.split('\r\n')

  it('utilise le point-virgule et la virgule décimale', () => {
    expect(csvAmount(1234.5)).toBe('1234,50')
    expect(csvAmount(0)).toBe('0,00')
    const entete = lignes.find((l) => l.startsWith('Emplacement;'))
    expect(entete).toBe(
      'Emplacement;Nom du client;Date d’arrivée;Date de départ;Nuits;Prix du séjour;' +
        'Détail des extras;Total extras;Mode de paiement;Total'
    )
    expect(csv).toContain(';73,00')
  })

  it('protège les cellules qui contiennent un point-virgule', () => {
    // Le détail des extras est séparé par « ; » : il doit être entre guillemets.
    const ligneDupont = lignes.find((l) => l.startsWith('Chêne;Dupont'))
    expect(ligneDupont).toContain('"2 pizzas')
    expect(ligneDupont.split(';').length).toBeGreaterThan(9)
  })

  it('titre la période et termine par la synthèse', () => {
    expect(lignes[0]).toContain('Domaine Jeantet')
    expect(lignes[0]).toContain('du 01/08/2025 au 31/08/2025')
    expect(csv).toContain('Synthèse par emplacement')
    expect(csv).toContain('TOTAL GÉNÉRAL;3;6;38,00;233,00')
    expect(csv).toContain('Dont carte bancaire;;;;113,00')
    expect(csv).toContain('Dont espèces;;;;120,00')
  })

  it('contient une ligne par réservation de la période, et pas les autres', () => {
    // Le bloc de détail : entre la ligne d'en-tête et la ligne vide suivante.
    const debut = lignes.findIndex((l) => l.startsWith('Emplacement;')) + 1
    const fin = lignes.indexOf('', debut)
    const lignesResa = lignes.slice(debut, fin)
    expect(lignesResa).toHaveLength(3)
    expect(lignesResa[0]).toMatch(/^La Bulle;Martin;03\/08\/2025;06\/08\/2025;3;/)
    expect(csv).not.toContain('Hors période')
  })

  it('nomme le fichier avec les deux bornes', () => {
    expect(csvFileName(AOUT.start, AOUT.end)).toBe(
      'reservations_domaine-jeantet_2025-08-01_2025-08-31.csv'
    )
  })

  it('prévoit le BOM UTF-8 attendu par Excel', () => {
    expect(BOM).toBe('\ufeff')
    expect(BOM.length).toBe(1)
  })

  it('rangeLabel décrit la période en clair', () => {
    expect(rangeLabel(AOUT.start, AOUT.end)).toBe('du 01/08/2025 au 31/08/2025')
    expect(rangeLabel(null, null)).toBe('')
  })
})
