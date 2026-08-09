import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { auth, CONFIG_IS_PLACEHOLDER } from '../firebase'
import { SPOTS } from '../constants'
import SpotIcon from './SpotIcon'

// Traduction des codes d'erreur Firebase en français simple.
function messageErreur(code) {
  switch (code) {
    case 'auth/invalid-email':
      return "L'adresse e-mail n'est pas valide."
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Adresse e-mail ou mot de passe incorrect.'
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Merci de patienter quelques minutes.'
    case 'auth/network-request-failed':
      return 'Pas de connexion Internet. Vérifiez le réseau puis réessayez.'
    default:
      return 'Connexion impossible. Vérifiez vos identifiants et réessayez.'
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Merci de remplir l’adresse e-mail et le mot de passe.')
      return
    }

    setBusy(true)
    try {
      // Session conservée sur la tablette : pas de reconnexion chaque jour.
      await setPersistence(auth, browserLocalPersistence)
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err) {
      setError(messageErreur(err && err.code))
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">Domaine Jeantet</h1>
        <p className="login-subtitle">Gestion des réservations</p>

        <div className="login-spots" aria-hidden="true">
          {SPOTS.map((s) => (
            <span key={s.id} className="login-spot" style={{ color: s.color }}>
              <SpotIcon type={s.icon} size={30} />
            </span>
          ))}
        </div>

        {CONFIG_IS_PLACEHOLDER && (
          <p className="alert alert-warning">
            Configuration Firebase non renseignée : il faut coller la vraie config dans
            <strong> src/firebase.js</strong>.
          </p>
        )}

        <label className="field">
          <span className="field-label">Adresse e-mail</span>
          <input
            className="field-input"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Mot de passe</span>
          <input
            className="field-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="alert alert-error">{error}</p>}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
