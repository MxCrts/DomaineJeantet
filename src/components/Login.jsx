import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { auth, CONFIG_IS_PLACEHOLDER } from '../firebase'
import { SPOTS } from '../constants'
import EyeIcon from './EyeIcon'
import FlagFR from './FlagFR'
import SpotIcon from './SpotIcon'

// Codes d'erreur qui veulent tous dire « ce couple e-mail / mot de passe ne
// correspond a aucun compte ». C'est le cas ou l'aide ci-dessous est utile.
const CODES_IDENTIFIANTS = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential']

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
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [aideIdentifiants, setAideIdentifiants] = useState(false)
  const [busy, setBusy] = useState(false)

  // Les claviers tactiles ajoutent facilement une espace en trop (barre
  // d'espace, ou espace automatique apres une suggestion). Invisible a l'oeil,
  // y compris mot de passe affiché : on le dit donc explicitement.
  const espaceParasite = password !== password.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setAideIdentifiants(false)

    if (!email.trim() || !password) {
      setError('Merci de remplir l’adresse e-mail et le mot de passe.')
      return
    }

    setBusy(true)
    try {
      // Session conservée sur la tablette : pas de reconnexion chaque jour.
      await setPersistence(auth, browserLocalPersistence)
      // L'adresse est nettoyée et mise en minuscules : sur tablette, le clavier
      // met volontiers une majuscule au premier caractère.
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
    } catch (err) {
      const code = err && err.code
      setError(messageErreur(code))
      setAideIdentifiants(CODES_IDENTIFIANTS.indexOf(code) !== -1)
      setBusy(false)
    }
  }

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-title">Domaine Jeantet</h1>
        <p className="login-owners">
          Louise &amp; Kevin
          <FlagFR size={20} />
        </p>
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
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field-label">Mot de passe</span>
          <div className="password-field">
            <input
              className="field-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {/* type="button" : sinon un appui enverrait le formulaire. */}
            <button
              type="button"
              className={'btn btn-reveal' + (showPassword ? ' is-on' : '')}
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
              title={showPassword ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
            >
              <EyeIcon off={showPassword} size={25} />
            </button>
          </div>
        </label>

        {espaceParasite && (
          <p className="alert alert-warning login-espace">
            Votre mot de passe commence ou se termine par une espace. C’est presque toujours la
            barre d’espace du clavier tactile : effacez-la avant de vous connecter.
          </p>
        )}

        {error && <p className="alert alert-error">{error}</p>}

        {aideIdentifiants && (
          <div className="login-aide">
            <p className="login-aide-titre">Ça marche sur l’ordinateur mais pas ici ?</p>
            <ul>
              <li>
                Touchez l’œil pour <strong>relire ce que vous avez tapé</strong> : le clavier de la
                tablette corrige et met des majuscules tout seul.
              </li>
              <li>
                Vérifiez qu’il n’y a <strong>pas d’espace</strong> avant ou après le mot de passe.
              </li>
              <li>
                Si le mot de passe s’est rempli tout seul, effacez-le complètement et retapez-le.
              </li>
            </ul>
          </div>
        )}

        <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
