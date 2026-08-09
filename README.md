# Domaine Jeantet — gestion des réservations

Petite application web de gestion des réservations pour 6 chambres d'hôtes.
Usage : une tablette, en mode paysage, un seul compte partagé.

- React + Vite (JavaScript)
- Firebase Auth (e-mail / mot de passe) + Firestore
- Déploiement automatique sur GitHub Pages
- Pas de routeur : navigation par onglets (Planning / Bilan)

## Développement en local

```bash
npm install
npm run dev
```

## Structure

```
src/
  firebase.js              config Firebase (à remplacer par la vraie)
  constants.js             les 6 chambres (nom + couleur) et les modes de paiement
  App.jsx                  authentification, chargement des données, onglets
  styles.css               toute la mise en forme
  components/
    Login.jsx              écran de connexion
    Planning.jsx           grille mensuelle chambres × jours
    ReservationForm.jsx    formulaire de réservation (création / édition)
    Bilan.jsx              totaux du mois par chambre
    MonthNav.jsx           navigation mois précédent / suivant
  utils/                   dates, montants, calculs de réservation
firestore.rules            règles de sécurité (à publier à la main)
```

## Modifier les chambres

Tout est dans `src/constants.js` : nom et couleur de chaque chambre.
**Ne pas changer les `id`** (`ch1` … `ch6`) : ils sont enregistrés dans les
réservations déjà saisies.

## Conventions retenues

- Un séjour occupe la chambre de la nuit d'arrivée jusqu'à la **veille** du
  départ (le jour du départ, la chambre est de nouveau libre). C'est ce que
  montre le planning, et c'est la règle utilisée pour détecter les
  chevauchements.
- Un chevauchement affiche un simple **avertissement** : il n'empêche jamais
  d'enregistrer.
- Le **bilan** compte une réservation dans le mois de sa **date d'arrivée**,
  pour la totalité de son montant (pas de prorata).
- Le **total** est calculé automatiquement (prix du séjour + extras) tant qu'on
  n'y touche pas. Dès qu'il est modifié à la main, c'est la valeur saisie qui
  est enregistrée (`totalIsManual: true`), avec un lien pour revenir au calcul
  automatique.

## Sécurité

La config Firebase dans `src/firebase.js` est publique par nature : elle part
dans le JavaScript envoyé au navigateur. La sécurité repose **uniquement** sur
les règles Firestore (`firestore.rules`), qui exigent un utilisateur connecté.
Ces règles doivent être publiées à la main dans la console Firebase.
