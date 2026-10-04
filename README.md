# 🗺️ Small World — en ligne

Jeu de conquête multijoueur **inspiré du jeu de société _Small World_**, jouable dans le navigateur, **100 % front-end** et **pair-à-pair** (WebRTC). Aucun serveur de jeu : il s'héberge tel quel sur GitHub Pages.

> Projet de fan, non affilié aux éditeurs de _Small World_.

## Fonctionnalités

- **Multijoueur pair-à-pair (2 à 5 joueurs)** via WebRTC ([PeerJS](https://peerjs.com/)) : l'hôte fait autorité, les autres envoient leurs actions.
- **Salons protégés par mot de passe** (hashé en SHA-256, jamais transmis en clair), code de salon à 6 caractères et **lien d'invitation**.
- **Reprise automatique si l'hôte se déconnecte** : chaque joueur garde une copie complète de la partie ; le joueur suivant dans l'ordre d'arrivée devient hôte et les autres se reconnectent à lui (détection en ~8 s grâce à un battement de cœur).
- **Reconnexion** : un joueur qui recharge la page ou revient retrouve sa place (même appareil ou même nom).
- **Sauvegarde automatique** de la partie dans le `localStorage` à chaque action, **export / import JSON**, et reprise depuis l'écran « Créer une partie ».
- **Réglages de partie** : nombre de joueurs, nombre de tours, temps par tour (le tour se joue automatiquement à expiration), dé de renfort activé ou non, carte par défaut ou personnalisée.
- **Éditeur de cartes** hexagonales : peinture de régions, terrains, mines / cavernes / sources magiques / tribus oubliées, génération aléatoire, annulation (Ctrl+Z), import / export JSON.
- **Évaluation de l'équilibrage** en direct : score sur 100, taille adaptée au nombre de joueurs, répartition des terrains et éléments, connectivité, points de départ…
- **12 races et 15 pouvoirs** (humains, elfes, nains, trolls, halfelins… / alchimistes, volants, marins, fortifiés…), déclin, dé de renfort, tribus oubliées.
- **Interface mobile** : plateau plein écran, panneaux escamotables, zoom au pincement, tap pour voir puis confirmer.
- **Zone d'informations** : fiches joueurs détaillées et légende des races sur la carte.
- **Statistiques de fin de partie** : classement, titres, graphique d'évolution des pièces, tableau détaillé.
- **Sons** synthétisés (Web Audio) avec réglage du volume et coupure.
- **~60 thèmes d'interface** (clairs, sombres, rétro, néo-brutalisme…), suivi du thème système.
- **Français et anglais**.

## Démarrage

Prérequis : Node.js 20+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Commande            | Rôle                                      |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Serveur de développement Vite             |
| `npm run build`     | Vérification TypeScript + build de prod   |
| `npm run preview`   | Sert le build (`dist/`)                   |
| `npm test`          | Tests unitaires (moteur de jeu, cartes)   |
| `npm run typecheck` | Vérification TypeScript seule             |

Pour tester le multijoueur en local, ouvrez deux fenêtres (dont une en navigation privée, pour avoir deux profils distincts).

## Déploiement sur GitHub Pages

Le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) teste, construit et publie le site à chaque push sur `main`.

1. Dans le dépôt GitHub : **Settings → Pages → Source : GitHub Actions**.
2. Poussez sur `main`. Le site est servi sur `https://<utilisateur>.github.io/<dépôt>/`.

Le build utilise des chemins relatifs (`base: "./"`) et un routage par hash (`#/room`), donc aucune configuration supplémentaire n'est nécessaire.

## Comment ça marche

### Réseau

```
 Joueur B ─┐                       ┌─ Joueur C
           │   actions  ▶          │
           └──────────▶  HÔTE  ◀───┘
              ◀ état complet de la salle (après chaque action)
```

- Le **broker public PeerJS** ne sert qu'à la mise en relation (signalisation) ; les données de jeu circulent ensuite directement entre navigateurs.
- L'hôte s'enregistre sous l'identifiant `smallworld-v1-<CODE>-<époque>`. À chaque changement d'hôte, l'époque augmente : le nouvel hôte est déterminé de façon identique par tous (premier joueur connecté dans l'ordre d'arrivée), qui se reconnectent à `<CODE>-<époque+1>`.
- L'hôte valide chaque action avec le moteur de jeu (fonction pure) et diffuse le nouvel état : un client ne peut pas tricher en modifiant son état local.

### Règles en bref

1. Sans race active, choisissez une combinaison race + pouvoir dans le marché (chaque combinaison sautée coûte 1 pièce, déposée dessus).
2. Conquérez : coût = 2 + 1 par jeton défenseur, montagne, fort, tanière ou tribu oubliée. Première conquête en bordure de carte. Dernière tentative possible avec le dé de renfort.
3. Redéployez, puis marquez 1 pièce par région + les bonus.
4. Quand votre race s'essouffle, passez-la **en déclin** et choisissez-en une nouvelle au tour suivant.

Le détail est disponible dans l'application (page **Règles**).

## Architecture

```
src/
├── core/               Logique pure, sans React ni réseau (testée)
│   ├── game/           Moteur : types, règles, races, pouvoirs, reducer (engine.ts)
│   ├── map/            Grille hexagonale, topologie, générateur, analyse d'équilibrage, édition
│   └── util/           RNG déterministe, identifiants
├── net/                WebRTC : protocole, session hôte/client, migration d'hôte
├── audio/              Effets sonores synthétisés, réglages du volume
├── store/              États zustand persistés : profil, cartes, sauvegardes, session
├── i18n/               Dictionnaires fr (référence) / en, hook useT()
├── themes/             Système de thèmes (tokens → variables CSS → classes Tailwind)
├── ui/                 Composants génériques (Button, Modal, Field, toasts…)
└── features/           Écrans : home, create, join, room (lobby), game, editor, rules, map
```

Principes :

- **Le moteur est une fonction pure** : `applyAction(état, joueur, action, maintenant) → nouvel état | erreur`. Tout l'aléatoire passe par un RNG à graine stocké dans l'état, donc une partie est reproductible.
- **Ajouter une race ou un pouvoir** = une entrée dans `core/game/races.ts` ou `powers.ts` (hooks `discount`, `score`, …) + ses deux traductions.
- **Ajouter un thème** = un fichier dans `src/themes/definitions/` (enregistré automatiquement).
- **Ajouter une langue** = un dictionnaire typé sur `fr.ts` (TypeScript signale toute clé manquante) déclaré dans `i18n/index.ts`.

## Versions

Le projet suit le [versionnage sémantique](https://semver.org/lang/fr/). La version vient de `package.json` (affichée en bas de l'accueil) et l'historique est dans [CHANGELOG.md](CHANGELOG.md).

Publier une version : mettre à jour `version` dans `package.json` (`npm version <x.y.z> --no-git-tag-version`), compléter le CHANGELOG, commiter, puis créer le tag `v<x.y.z>` et la release GitHub correspondante.

## Crédits

Icônes des races, pouvoirs et éléments de carte : [game-icons.net](https://game-icons.net) (licence [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)). Elles sont extraites par `npm run icons` (`scripts/build-icons.mjs`) dans `src/ui/icons/generated.ts`.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · zustand · PeerJS · Vitest
