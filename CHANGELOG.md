# Changelog

Toutes les évolutions notables du projet sont consignées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [Unreleased]

## [0.2.0] - 2026-10-05

### Ajouté

- **Extensions** optionnelles, choisies à la création de la partie et cumulables (sauf si elles se contredisent : un seul choix de saison) :
  - *Peuples maudits* : gobelins, kobolds, pouvoirs Grouillants et Maraudeurs ;
  - *Contrées sauvages* : dryades, farfadets, pouvoirs Impériaux et Retranchés ;
  - *Contes et légendes* : un événement tiré à chaque tour de jeu (moisson, brouillard, trêve, peste…) ;
  - *Hiver éternel* : lacs gelés conquérables, montagnes +1 en défense ;
  - *Grande sécheresse* : lacs asséchés conquérables, +1 pièce par région bordant la mer.
- **Ambiance** propre à chaque extension (halo coloré, emblème, particules : neige, braises, feuilles…) sur la création, le salon et le plateau ; les saisons repeignent aussi la carte.
- **Retours visuels** : éclair et onde à chaque conquête, épées et pertes lors d'une attaque, tribu qui s'en va, fort qui s'élève, bandeaux (tour, choix de race, déclin, gains, événement), compteur de pièces animé avec « +N », coût de conquête affiché sur les régions attaquables.
- Section *Extensions* dans les règles.

### Modifié

- **Nouveau style de carte** : textures légères par terrain (sillons, arbres, vagues…), relief doux aux frontières, rivages, ombre portée, grille hexagonale discrète et jetons en relief.
- Protocole réseau v4 : tous les joueurs doivent être en 0.2.0. Les sauvegardes précédentes restent compatibles (sans extension).

## [0.1.2] - 2026-10-04

### Ajouté

- Option de partie **Dé de renfort** (activé par défaut) : désactivé, aucune conquête au dé n'est possible et la statistique « Dés réussis » disparaît des résultats.
- **Animation du dé** : quand un joueur lance le dé de renfort, un dé 3D rebondit au centre du plateau chez tous les joueurs, puis affiche le résultat (réussite ou échec). Le son est synchronisé avec les rebonds ; l'animation est réduite si le système demande moins de mouvements.

### Modifié

- Protocole réseau v3 (nouvelle option de partie) : tous les joueurs doivent être en 0.1.2. Les sauvegardes précédentes restent compatibles (dé activé).

## [0.1.1] - 2026-10-04

### Ajouté

- **Son** : effets sonores synthétisés (Web Audio, aucun fichier) pour les conquêtes, attaques, dés, déclins, gains, votre tour, le chat et la victoire, avec réglage du volume et coupure du son (en-tête et paramètres).
- **Zone d'informations** : fiches joueurs détaillées (race active et en déclin, régions, jetons sur la carte et en main, forts, gain du dernier tour, gain prévu) dépliables pour lire les pouvoirs et l'historique des races, résumé du tour, et légende des joueurs sur la carte.
- **Statistiques de fin de partie** : classement avec titres (conquérant, seigneur de guerre…), graphique d'évolution des pièces avec infobulle et tableau de données, tableau détaillé (conquêtes, pertes, dés, marché, bonus…).
- **Cartes races et pouvoirs illustrées** : icônes vectorielles (game-icons.net, CC BY 3.0) et couleurs propres à chaque race et pouvoir, dans le marché, les fiches joueurs, les règles et sur la carte (jetons, éléments, forts, tanières, terriers).

### Modifié

- **Interface mobile** : plateau plein écran, barre d'actions en bas et panneaux en feuille escamotable, zoom au pincement, sélection d'une région au premier tap puis confirmation (Conquérir / −1 / +1), en-tête compact.
- Palette des joueurs ajustée (lisibilité et daltonisme validés en thème clair et sombre).
- Dépendances séparées dans un chunk dédié (meilleur cache entre versions).
- Protocole réseau v2 : les joueurs doivent tous être en 0.1.1 ; les sauvegardes 0.1.0 restent compatibles.

## [0.1.0] - 2026-10-04

Première version jouable.

### Ajouté

- Multijoueur pair-à-pair (2 à 5 joueurs) en WebRTC via PeerJS, hôte faisant autorité.
- Salons protégés par mot de passe (hashé), code à 6 caractères et lien d'invitation.
- Reprise automatique de l'hôte en cas de déconnexion (battement de cœur, détection en ~8 s) et reconnexion des joueurs à leur place.
- Sauvegarde automatique dans le localStorage, export / import JSON, reprise d'une partie.
- Réglages de partie : nombre de joueurs, nombre de tours, temps par tour, choix de la carte.
- Moteur de jeu pur et testé : 12 races, 15 pouvoirs, déclin, dé de renfort, tribus oubliées, forts, tanières, terriers.
- Cartes hexagonales générées (une par nombre de joueurs) et éditeur de cartes avec évaluation de l'équilibrage en direct.
- Une soixantaine de thèmes d'interface, français et anglais.
- Déploiement automatique sur GitHub Pages.

[Unreleased]: https://github.com/FlorianDaunay/small-world/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/FlorianDaunay/small-world/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/FlorianDaunay/small-world/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/FlorianDaunay/small-world/releases/tag/v0.1.0
