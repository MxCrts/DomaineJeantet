// ---------------------------------------------------------------------------
// Configuration des emplacements du camping.
//
// Pour renommer un emplacement, changer sa couleur ou son icone : modifier
// ci-dessous. Pour en ajouter un : copier une ligne, lui donner un "id" NEUF
// (ch7, ch8...) et c'est tout, le reste de l'application s'adapte.
//
// /!\ Ne JAMAIS modifier un "id" existant : c'est lui qui est enregistre dans
//     les reservations deja saisies en base. Le nom, la couleur et l'icone
//     peuvent en revanche etre changes librement, a tout moment.
//
// icon : 'van' (van / camping-car), 'caravan' (caravane), 'bubble' (bulle).
//        Les dessins sont dans components/SpotIcon.jsx.
// ---------------------------------------------------------------------------

export const SPOTS = [
  { id: 'ch1', name: 'Chêne', color: '#3F6B45', icon: 'van' },
  { id: 'ch2', name: 'Caravane', color: '#A64C28', icon: 'caravan' },
  { id: 'ch3', name: 'Érable', color: '#8F6410', icon: 'van' },
  { id: 'ch4', name: 'Sunset', color: '#9C3F5C', icon: 'van' },
  { id: 'ch5', name: 'Hangar', color: '#4A6478', icon: 'van' },
  { id: 'ch6', name: 'La Bulle', color: '#26706D', icon: 'bubble' },
]

export function getSpot(spotId) {
  return SPOTS.find((s) => s.id === spotId) || null
}

export function spotName(spotId) {
  const s = getSpot(spotId)
  return s ? s.name : 'Emplacement inconnu'
}

export function spotColor(spotId) {
  const s = getSpot(spotId)
  return s ? s.color : '#6B6259'
}

export const PAYMENT_METHODS = [
  { value: 'cb', label: 'Carte bancaire' },
  { value: 'especes', label: 'Espèces' },
]

export function paymentLabel(value) {
  const p = PAYMENT_METHODS.find((m) => m.value === value)
  return p ? p.label : ''
}
