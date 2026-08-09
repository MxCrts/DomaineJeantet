# Domaine Jeantet — gestion des réservations

Petite application web de gestion des réservations pour les 6 emplacements du
camping (vans / camping-cars, une caravane, une bulle).
Usage : une tablette, en mode paysage, un seul compte partagé.

- React + Vite (JavaScript)
- Firebase Auth (e-mail / mot de passe) + Firestore
- Déploiement automatique sur GitHub Pages
- Pas de routeur : navigation par onglets (Planning / Bilan)

## Développement en local

```bash
npm install
npm run dev     # serveur de développement
npm test        # tests unitaires (vitest)
npm run build   # build de production
```

## Structure

```
src/
  firebase.js              config Firebase
  constants.js             les 6 emplacements (nom + couleur + icône) et les paiements
  App.jsx                  authentification, chargement des données, onglets
  styles.css               toute la mise en forme
  components/
    Login.jsx              écran de connexion
    Planning.jsx           grille mensuelle emplacements × jours
    ReservationForm.jsx    formulaire de réservation (création / modification)
    Bilan.jsx              tableau de bord du mois
    MonthNav.jsx           navigation mois précédent / suivant
    SpotIcon.jsx           icônes SVG (van, caravane, bulle) dessinées à la main
    render.test.jsx        tests de rendu des trois écrans
  utils/                   dates, montants, calculs et chevauchements
    reservations.test.js   tests des chevauchements
firestore.rules            règles de sécurité (à publier à la main)
```

## Modifier les emplacements

Tout est dans `src/constants.js` : nom, couleur et icône (`van`, `caravan` ou
`bubble`). Pour en ajouter un, copier une ligne et lui donner un `id` neuf.

**Ne jamais changer un `id` existant** (`ch1` … `ch6`) : c'est lui qui est
enregistré dans les réservations déjà saisies en base. Les noms, couleurs et
icônes peuvent en revanche être modifiés à tout moment sans rien casser.

## Règles métier

- **Occupation.** Un séjour est l'intervalle `[arrivée, départ)` : la nuit
  d'arrivée est occupée, le jour du départ l'emplacement est de nouveau libre.
  C'est ce que montre le planning.
- **Chevauchement : bloquant.** Impossible d'enregistrer deux séjours qui
  partagent une nuit sur le même emplacement. Le message dit lequel et quand.
  Exemple : face à un séjour 11 → 12, un séjour 8 → 11 est accepté (le départ
  du premier libère la place), un séjour 8 → 12 est refusé.
  Les dates sont comparées en **numéros de jour absolus** (année/mois/jour
  recomposés en UTC) : ni l'heure, ni le fuseau, ni le changement d'heure ne
  peuvent fausser le calcul. Couvert par les tests de
  `src/utils/reservations.test.js`.
- **Bilan.** Une réservation compte dans le mois de sa date d'arrivée, pour la
  totalité de son montant (pas de prorata).
- **Total.** Calculé automatiquement (prix du séjour + extras) tant qu'on n'y
  touche pas. Dès qu'il est modifié à la main, c'est la valeur saisie qui est
  enregistrée (`totalIsManual: true`), avec un lien pour revenir au calcul
  automatique.

## Sécurité

La config Firebase dans `src/firebase.js` est publique par nature : elle part
dans le JavaScript envoyé au navigateur. La sécurité repose **uniquement** sur
les règles Firestore (`firestore.rules`), qui exigent un utilisateur connecté.
Ces règles doivent être publiées à la main dans la console Firebase.
