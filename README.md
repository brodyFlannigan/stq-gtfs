# STQ GTFS

Générateur de données GTFS pour les services de traversier de la Société des Traversiers du Québec (STQ)

## Installation & Utilisation

- Cloner ce répositoire
- `npm run prepare`
- `npm run main`

## À propos

Cet outil utilise les données de l'[API de la STQ](https://donnees.traversiers.com) ainsi que des données saisies manuellement afin de créer un fichier GTFS.

## Configuration

- Pour configurer la période couverte par le GTFS, `data/config.json`
  - Les champs `earliest_day` et `latest_day` permettent de contrôler la période à couvrir relativement au jour de l'exécution du programme. Il est possible d'utiliser des valeurs négatives afin de retourner dans le passé.
  - Tout ce qui concerne les temps de parcours et les paires d'origine-destination est configuré dans `data/service_patterns.json`.
  - Le reste est pas mal tout dans `data/static`

## Notes

- La grande majorité du code présent dans ce programme à été écrite par ChatGPT en suivant des instructions qui lui ont été données.
- Ces données et ce code est fourni sans aucune garantie quoi que ce soit. L'utilisation est à vos propres risques.
- Ce programme n'est pas sanctionné, approuvé ou cautionné par la Société des Traversiers du Québec (STQ).
