# Changelog

Toutes les évolutions notables du projet sont consignées ici.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le projet respecte le [versionnage sémantique](https://semver.org/lang/fr/).

## [Unreleased]

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

[Unreleased]: https://github.com/FlorianDaunay/small-world/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/FlorianDaunay/small-world/releases/tag/v0.1.0
