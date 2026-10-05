# Small World — instructions du projet

Jeu de conquête multijoueur **inspiré du jeu de société « Small World »**, jouable dans le navigateur.

## Exigences produit

| Domaine | Exigence |
| --- | --- |
| Hébergement | 100 % front-end, publié sur **GitHub Pages** (aucun serveur de jeu). |
| Réseau | **WebRTC pair-à-pair** entre joueurs (PeerJS ; le broker ne sert qu'à la signalisation). |
| Robustesse | **Reprise de l'hôte** : si l'hôte se déconnecte, un autre joueur prend le relais et la partie continue. |
| Sauvegarde | Partie en cours sauvegardée en **JSON / localStorage** (export/import de fichier possible). |
| Interface | UI moderne basée sur le **système de thèmes** (`src/themes`). |
| Langues | **Français et anglais** uniquement pour l'instant. |
| Qualité | Code propre, modulaire, facile à reprendre, professionnel. |

### Écrans

- **Accueil** : créer une partie, rejoindre, éditeur de cartes, règles.
- **Créer une partie** : nouvelle partie ou **reprise** d'une sauvegarde. Réglages : temps par tour, nombre de tours, nombre de joueurs, carte (par défaut ou créée).
- **Rejoindre** : code du salon + **mot de passe** (pour que n'importe qui ne puisse pas entrer).
- **Éditeur de cartes** : création de cartes avec **évaluation de l'équilibrage** (trop ou pas assez de certains terrains/éléments, taille, connectivité…).

## Commandes

```bash
npm run dev        # serveur de dev
npm test           # tests unitaires (vitest)
npm run typecheck  # TypeScript
npm run build      # typecheck + build de production
```

Avant de considérer une tâche terminée : `npm test` et `npm run build` doivent passer.

## Architecture

```
src/core/     logique pure (aucun import React, DOM ou réseau) — testée
  game/       types, rules.ts (requêtes), engine.ts (reducer), races.ts, powers.ts
  map/        hex.ts, topology.ts, generator.ts, analysis.ts (équilibrage), edit.ts, validate.ts
src/net/      protocol.ts (messages), session.ts (hôte/client/migration), peer.ts, config.ts
src/store/    stores zustand persistés : profile, maps, saves, session
src/i18n/     fr.ts (référence typée), en.ts, index.ts (useT)
src/themes/   tokens → variables CSS → classes Tailwind (bg-surface, rounded-card…)
src/ui/       composants génériques
src/features/ un dossier par écran (home, create, join, room, game, editor, rules, map)
```

## Conventions

- **Moteur pur** : toute modification de partie passe par `applyAction` / `applySystem` (`core/game/engine.ts`), qui renvoie un nouvel état sans muter l'ancien. L'aléatoire utilise uniquement le RNG à graine stocké dans l'état (`rngState`) ; `Date.now()` est passé en paramètre.
- **L'hôte fait autorité** : les clients envoient des actions, l'hôte valide et diffuse l'état complet de la salle (`RoomSnapshot`). Toute nouvelle donnée de partie doit vivre dans `GameState` ou `RoomSnapshot` pour survivre à une migration d'hôte et à une sauvegarde.
- **Protocole** : un changement incompatible des messages ou de l'état impose d'incrémenter `PROTOCOL_VERSION` (`net/protocol.ts`).
- **Races / pouvoirs** : une entrée dans `races.ts` / `powers.ts` (hooks `discount`, `score`, drapeaux…) + traductions `race.<id>` / `power.<id>` dans les deux langues. Ne pas coder de cas particulier ailleurs que via ces hooks.
- **Extensions** : une entrée dans `core/game/extensions.ts` (races, pouvoirs, `rules` = hooks `WorldRules` appliqués à tous, `events`, `conflicts` symétriques) + traductions `extension.<id>` + art/ambiance dans `features/extensions/art.ts`. Les événements de « Contes et légendes » sont dans `core/game/events.ts` (traductions `event.<id>`).
- **Retours visuels** : comme les sons, les animations (`features/game/effects`) sont dérivées du journal (`newLogEntries`) ; une entrée liée à une région porte le paramètre `region`.
- **Textes** : aucune chaîne visible en dur dans les composants ; tout passe par `useT()`. `fr.ts` définit les clés, `en.ts` doit avoir exactement les mêmes (vérifié par TypeScript). Les entrées du journal et de l'analyse stockent des clés + paramètres, traduits à l'affichage.
- **Thèmes** : n'utiliser que les tokens (`bg-surface`, `text-text-muted`, `border-border`, `rounded-card`, `shadow-card`…) et les classes de `index.css` (`card`, `btn`, `input`…). Seules les couleurs de carte (terrains) et de joueurs sont fixes (`features/map/palette.ts`).
- **Icônes** : uniquement via `<Icon name=…>` (`src/ui/icons`). Pour en ajouter, compléter la liste de `scripts/build-icons.mjs` puis `npm run icons` (ne jamais éditer `generated.ts`). Pas d'emoji dans l'UI. Les couleurs et icônes des races/pouvoirs sont dans `features/cards/art.ts` (hors du moteur).
- **Son** : `playSound()` (`src/audio/sound.ts`) ; les sons de partie sont dérivés du journal dans `useRoomSounds`, pas déclenchés dans le moteur.
- **Mobile** : tester chaque écran en largeur téléphone ; sur tactile, une action sur la carte se fait en deux temps (tap = sélection, puis bouton ou second tap).
- **Stockage** : passer par `store/storage.ts` (préfixe `smallworld:`, accès protégés par try/catch).
- **Versions** : semver ; la version vit uniquement dans `package.json` (exposée via `src/version.ts`). Toute release met à jour `CHANGELOG.md` et reçoit un tag `v<x.y.z>`. Le `PROTOCOL_VERSION` réseau est indépendant de la version de l'app.
- **Tests** : toute règle de jeu ou d'analyse de carte ajoutée doit être couverte dans `core/**/*.test.ts`.
