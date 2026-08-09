import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// ---------------------------------------------------------------------------
// Config du projet Firebase "domaine-jeantet".
// (Console Firebase > Parametres du projet > Vos applications > Application Web)
//
// Ces valeurs sont PUBLIQUES par nature : elles se retrouvent dans le bundle
// JavaScript envoye au navigateur. Ce n'est pas un secret. La securite repose
// entierement sur les regles Firestore (fichier firestore.rules), qui exigent
// une authentification.
// ---------------------------------------------------------------------------

const firebaseConfig = {
  apiKey: 'AIzaSyCH4cLpNmcPUjdXb_HL8-uZN-eLfxg-tTM',
  authDomain: 'domaine-jeantet.firebaseapp.com',
  projectId: 'domaine-jeantet',
  storageBucket: 'domaine-jeantet.firebasestorage.app',
  messagingSenderId: '153281714923',
  appId: '1:153281714923:web:f40aa747d3df5e9d8f3cae',
}

// Petit garde-fou : affiche un avertissement clair tant que la config n'a pas
// ete remplacee, au lieu d'une erreur Firebase incomprehensible.
export const CONFIG_IS_PLACEHOLDER = firebaseConfig.apiKey.startsWith('PLACEHOLDER')

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
