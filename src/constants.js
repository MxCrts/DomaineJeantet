// ---------------------------------------------------------------------------
// Configuration des chambres.
// Pour renommer une chambre ou changer sa couleur : modifier ci-dessous.
// /!\ Ne PAS modifier les "id" : ils sont enregistres dans les reservations
//     deja saisies. Le "name" et la "color" peuvent etre changes librement.
// ---------------------------------------------------------------------------

export const ROOMS = [
  { id: 'ch1', name: 'Lavande', color: '#6B4E9E' },
  { id: 'ch2', name: 'Tournesol', color: '#B87708' },
  { id: 'ch3', name: 'Coquelicot', color: '#B5342A' },
  { id: 'ch4', name: 'Olivier', color: '#41702B' },
  { id: 'ch5', name: 'Glycine', color: '#8E3470' },
  { id: 'ch6', name: 'Cerisier', color: '#1B6591' },
]

export function getRoom(roomId) {
  return ROOMS.find((r) => r.id === roomId) || null
}

export function roomName(roomId) {
  const r = getRoom(roomId)
  return r ? r.name : 'Chambre inconnue'
}

export function roomColor(roomId) {
  const r = getRoom(roomId)
  return r ? r.color : '#666666'
}

export const PAYMENT_METHODS = [
  { value: 'cb', label: 'Carte bancaire' },
  { value: 'especes', label: 'Espèces' },
]

export function paymentLabel(value) {
  const p = PAYMENT_METHODS.find((m) => m.value === value)
  return p ? p.label : ''
}
