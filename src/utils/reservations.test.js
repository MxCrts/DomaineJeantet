import { describe, it, expect } from 'vitest'
import { dayNumber, overlaps, findConflicts, assignLanes } from './reservations'

/** Raccourci : d(2025, 8, 11) = 11 août 2025 (mois en clair, pas en index). */
function d(year, month, day) {
  return new Date(year, month - 1, day)
}

describe('dayNumber', () => {
  it('ignore complètement l’heure', () => {
    const matin = new Date(2025, 7, 11, 0, 0, 0)
    const soir = new Date(2025, 7, 11, 23, 59, 59)
    expect(dayNumber(matin)).toBe(dayNumber(soir))
  })

  it('donne des jours consécutifs autour du changement d’heure', () => {
    // Passage à l'heure d'hiver en France : nuit du 25 au 26 octobre 2025.
    expect(dayNumber(d(2025, 10, 26)) - dayNumber(d(2025, 10, 25))).toBe(1)
    // Passage à l'heure d'été : nuit du 29 au 30 mars 2025.
    expect(dayNumber(d(2025, 3, 30)) - dayNumber(d(2025, 3, 29))).toBe(1)
  })

  it('renvoie NaN pour une valeur absente', () => {
    expect(Number.isNaN(dayNumber(null))).toBe(true)
  })
})

describe('overlaps', () => {
  // Réservation de référence : 11 -> 12 août
  const refArr = d(2025, 8, 11)
  const refDep = d(2025, 8, 12)

  it('aucun chevauchement (avant, sans contact)', () => {
    expect(overlaps(d(2025, 8, 5), d(2025, 8, 8), refArr, refDep)).toBe(false)
  })

  it('aucun chevauchement (après, sans contact)', () => {
    expect(overlaps(d(2025, 8, 20), d(2025, 8, 24), refArr, refDep)).toBe(false)
  })

  it('chevauchement partiel avant', () => {
    // 8 -> 12 : la nuit du 11 est prise deux fois
    expect(overlaps(d(2025, 8, 8), d(2025, 8, 12), refArr, refDep)).toBe(true)
  })

  it('chevauchement partiel après', () => {
    // 11 -> 15 sur un existant 9 -> 13
    expect(overlaps(d(2025, 8, 11), d(2025, 8, 15), d(2025, 8, 9), d(2025, 8, 13))).toBe(true)
  })

  it('inclusion totale (le nouveau est dans l’existant)', () => {
    expect(overlaps(d(2025, 8, 12), d(2025, 8, 14), d(2025, 8, 10), d(2025, 8, 20))).toBe(true)
  })

  it('inclusion totale (le nouveau englobe l’existant)', () => {
    expect(overlaps(d(2025, 8, 1), d(2025, 8, 30), refArr, refDep)).toBe(true)
  })

  it('dates identiques', () => {
    expect(overlaps(refArr, refDep, refArr, refDep)).toBe(true)
  })

  it('départ = arrivée : autorisé (cas de référence 8 -> 11 contre 11 -> 12)', () => {
    expect(overlaps(d(2025, 8, 8), d(2025, 8, 11), refArr, refDep)).toBe(false)
  })

  it('arrivée = départ de l’autre : autorisé (12 -> 15 contre 11 -> 12)', () => {
    expect(overlaps(d(2025, 8, 12), d(2025, 8, 15), refArr, refDep)).toBe(false)
  })

  it('même jour unique : une seule nuit, deux fois', () => {
    expect(overlaps(d(2025, 8, 11), d(2025, 8, 12), d(2025, 8, 11), d(2025, 8, 12))).toBe(true)
  })

  it('séjour de durée nulle : n’occupe aucune nuit', () => {
    expect(overlaps(d(2025, 8, 11), d(2025, 8, 11), refArr, refDep)).toBe(false)
  })

  it('l’heure de la journée ne change rien au résultat', () => {
    const arr = new Date(2025, 7, 8, 23, 30)
    const dep = new Date(2025, 7, 11, 0, 15)
    expect(overlaps(arr, dep, refArr, refDep)).toBe(false)
  })

  it('reste correct de part et d’autre d’un changement d’heure', () => {
    expect(overlaps(d(2025, 10, 24), d(2025, 10, 26), d(2025, 10, 26), d(2025, 10, 28))).toBe(false)
    expect(overlaps(d(2025, 10, 24), d(2025, 10, 27), d(2025, 10, 26), d(2025, 10, 28))).toBe(true)
  })
})

describe('findConflicts', () => {
  const existante = {
    id: 'abc',
    roomId: 'ch1',
    clientName: 'Dupont',
    arrival: d(2025, 8, 11),
    departure: d(2025, 8, 12),
  }
  const base = [existante]

  it('8 -> 11 sur le même emplacement : aucun conflit', () => {
    const found = findConflicts(base, {
      roomId: 'ch1',
      arrival: d(2025, 8, 8),
      departure: d(2025, 8, 11),
    })
    expect(found).toHaveLength(0)
  })

  it('8 -> 12 sur le même emplacement : conflit avec Dupont', () => {
    const found = findConflicts(base, {
      roomId: 'ch1',
      arrival: d(2025, 8, 8),
      departure: d(2025, 8, 12),
    })
    expect(found).toHaveLength(1)
    expect(found[0].clientName).toBe('Dupont')
  })

  it('mêmes dates mais autre emplacement : aucun conflit', () => {
    const found = findConflicts(base, {
      roomId: 'ch2',
      arrival: d(2025, 8, 11),
      departure: d(2025, 8, 12),
    })
    expect(found).toHaveLength(0)
  })

  it('en édition, une réservation n’est jamais en conflit avec elle-même', () => {
    const found = findConflicts(base, {
      id: 'abc',
      roomId: 'ch1',
      arrival: d(2025, 8, 11),
      departure: d(2025, 8, 12),
    })
    expect(found).toHaveLength(0)
  })

  it('nuit par nuit sur tout le mois : conflit uniquement la nuit du 11', () => {
    for (let jour = 1; jour <= 20; jour++) {
      const found = findConflicts(base, {
        roomId: 'ch1',
        arrival: d(2025, 8, jour),
        departure: d(2025, 8, jour + 1),
      })
      const attendu = jour === 11 ? 1 : 0
      expect(found).toHaveLength(attendu)
    }
  })

  it('remonte plusieurs conflits d’un coup', () => {
    const liste = [
      existante,
      { id: 'def', roomId: 'ch1', clientName: 'Martin', arrival: d(2025, 8, 14), departure: d(2025, 8, 16) },
    ]
    const found = findConflicts(liste, {
      roomId: 'ch1',
      arrival: d(2025, 8, 10),
      departure: d(2025, 8, 20),
    })
    expect(found).toHaveLength(2)
  })
})

describe('assignLanes', () => {
  it('garde tout sur une seule voie quand rien ne se chevauche', () => {
    const out = assignLanes([
      { startDay: 1, endDay: 3 },
      { startDay: 4, endDay: 6 },
    ])
    expect(out.map((i) => i.lane)).toEqual([0, 0])
    expect(out[0].laneCount).toBe(1)
  })

  it('empile deux réservations qui se chevauchent', () => {
    const out = assignLanes([
      { startDay: 1, endDay: 5 },
      { startDay: 3, endDay: 8 },
    ])
    expect(out.map((i) => i.lane)).toEqual([0, 1])
    expect(out[0].laneCount).toBe(2)
  })
})
