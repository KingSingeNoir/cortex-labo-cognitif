# Atelier cognitif — guide des agents

Atelier cognitif : application web React + Vite, **indépendante** de T3US (port 4100). Démarrer : `npm install` puis `npm start`. Vérifications : `npm run check`.

## Relais entre agents (Claude Code ⇄ Codex)

Ce projet est modifié **à tour de rôle** par Claude Code et par Codex (ChatGPT). Ils ne partagent pas leur mémoire : la mémoire commune, c'est ce dépôt GitHub.

**Au début de chaque session :**
1. `git pull` pour récupérer le travail de l'autre agent.
2. Lire `HANDOFF.md` (tâche en cours, prochaine étape). Ne pas explorer tout le projet : ouvrir seulement les fichiers utiles à la tâche, pour économiser les tokens.

**Pendant le travail :**
- Avancer par petites étapes ; commit après chaque étape qui marche, message court en français.
- Ne jamais lire ni modifier `node_modules/`, `dist/`, `build/`, ni les fichiers `.env` (secrets).
- Le propriétaire n'est pas développeur : expliquer simplement, sans jargon, et demander avant toute action irréversible (suppression, publication, envoi).
- Réponses courtes : pas de résumé de tout ce qui a été lu.

**Avant de s'arrêter, ou quand le propriétaire écrit « relais » :**
1. Mettre à jour `HANDOFF.md` (20 lignes maximum, remplacer l'ancien contenu plutôt qu'empiler).
2. `git add -A`, `git commit`, puis `git push`.

## Plan du projet (Graphify)

Un plan du code est rangé dans `graphify-out/` (sur l'ordinateur uniquement, jamais envoyé sur GitHub). Pour comprendre le projet ou trouver un fichier, **interroger le plan avant de fouiller les fichiers** : `graphify query "ta question"`, `graphify explain "NomDuComposant"`, `graphify path "A" "B"`. Lire `graphify-out/GRAPH_REPORT.md` pour une vue d'ensemble. Après un `git pull` ou de grosses modifications : `graphify update .` (rapide, gratuit, sans IA).

## Outils coûteux : autorisation obligatoire

ECC, Strix et OmniRoute sont installés mais **éteints par défaut**, car ils consomment des tokens ou de l'argent.
- Ne jamais allumer ECC (`plugin enable` / `plugin add ecc@ecc`), ne jamais lancer `strix` ni `omniroute`, ni modifier un réglage pour les utiliser, **sans un « oui » écrit du propriétaire dans la conversation en cours**.
- Avant de demander : expliquer en une ou deux phrases simples à quoi ça servirait ici et ce que ça risque de coûter (tokens, clé payante).
- Strix : uniquement sur le code local de ce projet, jamais contre un site en ligne ni une base de données réelle.
- OmniRoute : ne jamais y brancher les abonnements Claude ou ChatGPT du propriétaire.
- Si ECC est déjà allumé, rappeler au propriétaire de l'éteindre à la fin (raccourci « ECC - éteindre » dans Bureau > Outils coûteux).
