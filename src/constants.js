// ---------------------------------------------------------------------------
// Configuration des emplacements du camping.
//
// Pour renommer un emplacement, changer sa couleur ou son icone : modifier
// ci-dessous. Pour en ajouter un : copier une ligne, lui donner un "id" NEUF
// (ch7, ch8...), choisir son groupe, et c'est tout : le planning, le
// formulaire et le bilan s'adaptent seuls.
//
// /!\ Ne JAMAIS modifier un "id" existant : c'est lui qui est enregistre dans
//     les reservations deja saisies en base. Le nom, le groupe, la couleur et
//     l'icone peuvent en revanche etre changes librement, a tout moment.
//
// L'ORDRE de la liste SPOTS est l'ordre d'affichage (planning, select, bilan).
//
// icon : 'van' (van / camping-car), 'caravan' (caravane), 'bubble' (bulle).
//        Les dessins sont dans components/SpotIcon.jsx.
//
// Chaque emplacement porte trois couleurs, toujours de la meme famille :
//   color : la couleur pleine   -> barre laterale du bloc, pastilles, filets
//   tint  : la meme, tres clair -> fond des blocs du planning
//   ink   : la meme, tres foncee-> texte pose sur le fond clair (contraste >7:1)
//
// La palette est volontairement etalee a la fois en TEINTE et en LUMINOSITE :
// meme sans percevoir les couleurs (daltonisme), les six restent separables.
// ---------------------------------------------------------------------------

export const GROUPS = [
  { id: 'emplacements', label: 'Emplacements' },
  { id: 'hebergements', label: 'Hébergements' },
]

export const SPOTS = [
  // --- Emplacements : on vient avec son van / sa tente ---------------------
  { id: 'ch1', name: 'Chêne', group: 'emplacements', icon: 'van',
    color: '#2F6B3C', tint: '#DCE9DD', ink: '#1F4A29' },
  { id: 'ch3', name: 'Érable', group: 'emplacements', icon: 'van',
    color: '#B5820E', tint: '#F5E8CC', ink: '#6E4E08' },
  { id: 'ch4', name: 'Sunset', group: 'emplacements', icon: 'van',
    color: '#C6512B', tint: '#F9E1D6', ink: '#8B3419' },
  { id: 'ch5', name: 'Hangar', group: 'emplacements', icon: 'van',
    color: '#3D6B94', tint: '#DBE6F1', ink: '#274A6B' },

  // --- Hebergements : c'est le domaine qui loge ----------------------------
  { id: 'ch2', name: 'Caravane', group: 'hebergements', icon: 'caravan',
    color: '#9B3350', tint: '#F6DBE2', ink: '#6C1F37' },
  { id: 'ch6', name: 'La Bulle', group: 'hebergements', icon: 'bubble',
    color: '#0F8079', tint: '#D5E9E6', ink: '#0A5450' },
]

/** Les groupes, chacun avec ses emplacements, dans l'ordre d'affichage. */
export const SPOT_GROUPS = GROUPS.map((g) => ({
  ...g,
  spots: SPOTS.filter((s) => s.group === g.id),
})).filter((g) => g.spots.length > 0)

// Emplacement de secours : sert uniquement si une vieille reservation pointe
// vers un id qui n'existe plus dans la liste ci-dessus.
const UNKNOWN_SPOT = {
  id: '',
  name: 'Emplacement inconnu',
  group: '',
  icon: 'van',
  color: '#6B6259',
  tint: '#EBE8E4',
  ink: '#3A342E',
}

export function getSpot(spotId) {
  return SPOTS.find((s) => s.id === spotId) || null
}

/** Toujours un emplacement complet (jamais null) : pratique pour l'affichage. */
export function spotOrUnknown(spotId) {
  return getSpot(spotId) || UNKNOWN_SPOT
}

export function spotName(spotId) {
  return spotOrUnknown(spotId).name
}

export function spotColor(spotId) {
  return spotOrUnknown(spotId).color
}

export const PAYMENT_METHODS = [
  { value: 'cb', label: 'Carte bancaire' },
  { value: 'especes', label: 'Espèces' },
]

export function paymentLabel(value) {
  const p = PAYMENT_METHODS.find((m) => m.value === value)
  return p ? p.label : ''
}
