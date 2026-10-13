# Gestionnaire de Finances Personnelles

Ce projet est une application web locale permettant de suivre vos finances (dettes, investissements, patrimoine) en remplacement d'un fichier Excel complexe. Il permet de visualiser l'évolution de votre valeur nette et de vos dettes.

## 🚀 Architecture

- **Backend** : FastAPI (Python 3.12+)
- **Base de données** : SQLite (fichier local `backend/finance.db`)
- **Frontend** : React + TypeScript (Vite)
- **Styling** : Tailwind CSS
- **Graphiques** : Recharts

## 🛠️ Installation et Démarrage

### Prérequis
- Python 3.x
- Node.js & npm

### Lancement rapide
Pour démarrer simultanément le backend et le frontend, utilisez le script à la racine :

```bash
bash start_app.sh
```

L'application sera disponible sur [http://localhost:5173](http://localhost:5173).

### Base de données et migrations
Au démarrage, le backend met la base à jour avec les migrations Alembic (`backend/migrations/`). Avant d'appliquer une migration, il copie la base dans `backend/finance.db.bak-<date>-avant-migration-<révision>`. Seules les 3 copies les plus récentes de ce type (`finance.db.bak-*`) sont gardées.

Après une modification de `backend/app/models.py`, créez la migration correspondante :

```bash
cd backend
alembic revision --autogenerate -m "description du changement"
```

### Tests
Les tests du backend utilisent une base temporaire : ils ne touchent jamais `backend/finance.db`.

```bash
cd backend
source venv_linux/bin/activate
pip install -r requirements-dev.txt
pytest
```

## 🌐 Publication sur slashbin.net

L'application est en ligne sur [https://slashbin.net/budget/](https://slashbin.net/budget/), réservée au propriétaire du site (carte « Budget » du tableau de bord). C'est la seule instance qui écrit dans `backend/finance.db` : `start_app.sh` refuse de démarrer tant qu'elle tourne.

- **Backend** : service systemd utilisateur `budget.service` (`~/.config/systemd/user/`), `uvicorn` sur `127.0.0.1:8020`, environnement Python `~/.budget-venv` (hors de `~/Cloud` : Nextcloud ne synchronise pas les liens symboliques d'un venv). Le port n'est pas 8000, que `clean_ports.py` libère de force.
- **Frontend** : compilé dans `/var/www/slashbin.net/budget/app/`. Ses appels passent par `budget/api.php`, qui vérifie la session du propriétaire puis relaie vers le backend.
- **Publier une modification** (frontend ou backend) :

  ```bash
  ./deploy_slashbin.sh
  ```

  Le script compile le frontend avec les bons chemins (`/budget`), le copie, puis redémarre le service, qui applique les nouvelles migrations après sauvegarde de la base.
- **Suivre le service** : `systemctl --user status budget.service` et `journalctl --user -u budget.service`.
- **Développer en local** : `systemctl --user stop budget.service`, puis `bash start_app.sh`. Redémarrer le service ensuite.

## 🔄 Rapprochement avec les sources externes

`backend/reconcile.py` compare la base à des sources tenues ailleurs et signale les écarts. Les deux sources sont facultatives :

- **un classeur de dettes** (`.xlsx`, local ou récupéré avec [rclone](https://rclone.org/) depuis Google Drive, OneDrive…) : un bloc de lignes, une dette par ligne, son nom dans une colonne et son solde actuel dans une autre ;
- **un relevé de positions de courtier** (`.csv`) : le plus récent des fichiers d'un dossier qui suivent un motif. Par défaut, le relevé de positions de Wealthsimple (`holdings-report-AAAA-MM-JJ.csv`). La valeur marchande de chaque compte est convertie dans la devise de base, au taux de la Banque du Canada du jour du relevé, ou à un taux fixé.

Sans option, le script ne modifie rien : il écrit un rapport Markdown (soldes de la source et de l'app, écart, éléments sans correspondance, nombre de positions par compte). Avec `--apply debts` ou `--apply accounts`, il enregistre les soldes qui diffèrent comme des relevés datés (date de modification du classeur, date du relevé), par l'API de l'app, qui doit tourner : l'écart est reporté sur les soldes calculés qui suivent, jusqu'au prochain solde saisi ou importé, comme pour une saisie à la main. `--only NOM…` limite l'application à certaines lignes.

Mise en route :

```bash
cd backend
python reconcile.py   # crée reconcile_config.json à partir de reconcile_config.example.json
# compléter reconcile_config.json, puis :
python reconcile.py                                 # rapport : reconcile_report.md
python reconcile.py --apply accounts                # enregistrer les écarts des comptes
python reconcile.py --apply debts --only Visa Auto  # seulement ces dettes
```

| Clé de `reconcile_config.json` | Rôle | Par défaut |
|---|---|---|
| `api_url` | API de l'app, pour `--apply` | `http://127.0.0.1:8000` |
| `spreadsheet.path` ou `spreadsheet.rclone_remote` | Le classeur, local ou distant (`gdrive:dettes.xlsx`) | aucun : pas de dettes |
| `spreadsheet.sheet` | Feuille à lire (`--sheet` sur la ligne de commande) | l'année en cours |
| `spreadsheet.name_column`, `balance_column`, `first_row` | Colonnes du nom et du solde, première ligne du bloc, qui s'arrête à la première ligne sans nom | `A`, `B`, `2` |
| `holdings.directory`, `holdings.pattern` | Dossier des relevés et motif de leurs noms | aucun : pas de comptes ; `holdings-report-*.csv` |
| `holdings.base_currency`, `holdings.fx_rates` | Devise de l'app et taux fixés (`{"USD": 1.37}`) ; sans taux fixé, la Banque du Canada (base CAD seulement) | `CAD`, `{}` |
| `holdings.columns` | Noms des colonnes du relevé : compte, type, classification, symbole, valeur, devise | ceux de Wealthsimple |
| `debts`, `debts_ignore` | Nom dans le classeur → nom de la dette dans l'app, quand ils diffèrent (sinon, même nom à la casse près) ; lignes à ignorer | |
| `accounts`, `accounts_ignore` | Clé du compte (`compte\|type\|classification`, telle qu'affichée dans le rapport) → nom de l'actif dans l'app ; comptes à ignorer | |

La configuration et le rapport contiennent des noms et des montants personnels : `.gitignore` les tient hors du dépôt.

## 📂 Structure du Projet

- `/backend` : API Python, modèles de données et base de données SQLite.
- `/frontend` : Application React avec tableau de bord et graphiques.

## 📈 Fonctionnalités Actuelles (MVP)

- **Tableau de bord** : Vue d'ensemble des Actifs, Passifs et Valeur Nette. Les graphes d'évolution placent les relevés sur une échelle de temps : des soldes annuels anciens et des relevés récents rapprochés y gardent leur juste place. La valeur nette commence à la première valeur d'actif enregistrée ; avant elle, les dettes seules en donneraient une fausse.
- **Suivi des Dettes** : Liste détaillée et graphique d'évolution historique.
- **Soldes saisis et soldes calculés** : un solde saisi ou importé est une observation. Une correction ou une transaction datée d'avant ne le déplace pas : elle se reporte sur les soldes calculés par l'app qui la suivent, jusqu'à ce solde. Une transaction s'applique aussi au solde de son propre jour.
- **Entrées** : paies et virements reçus (page Entrées). Une entrée s'ajoute au compte qui la reçoit ; avec une provenance, elle est aussi déduite de ce compte (virement entre deux comptes de l'app). Un compte sous zéro est signalé sur Actifs & Passifs et Banques : il y manque sans doute une entrée. L'export CSV des transactions (page Dépenses) les contient : type « Entrée », compte « provenance -> compte », chaque côté écrit « Banque: compte », « Banque » ou « Extérieur ».
- **Gestion du Patrimoine** : Centralisation des biens immobiliers et comptes bancaires.
- **Investissements** : Répertoire des stocks et dividendes canadiens.

## 🔒 Confidentialité
Les données sont stockées dans le fichier `backend/finance.db`, sur le serveur. La page web de slashbin.net les affiche à distance, après vérification de la session du propriétaire ; le backend lui-même n'écoute que sur la machine (`127.0.0.1`). Le fichier, dans `~/Cloud`, est copié sur le serveur Nextcloud de la même machine, puis sauvegardé chaque nuit avec 90 jours d'historique.
