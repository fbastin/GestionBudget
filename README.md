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
Au démarrage, le backend met la base à jour avec les migrations Alembic (`backend/migrations/`). Avant d'appliquer une migration, il copie la base dans `backend/finance.db.bak-<date>-avant-migration-<révision>`.

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

## 📂 Structure du Projet

- `/backend` : API Python, modèles de données et base de données SQLite.
- `/frontend` : Application React avec tableau de bord et graphiques.

## 📈 Fonctionnalités Actuelles (MVP)

- **Tableau de bord** : Vue d'ensemble des Actifs, Passifs et Valeur Nette.
- **Suivi des Dettes** : Liste détaillée et graphique d'évolution historique.
- **Gestion du Patrimoine** : Centralisation des biens immobiliers et comptes bancaires.
- **Investissements** : Répertoire des stocks et dividendes canadiens.

## 🔒 Confidentialité
Les données sont stockées dans le fichier `backend/finance.db`, sur le serveur. La page web de slashbin.net les affiche à distance, après vérification de la session du propriétaire ; le backend lui-même n'écoute que sur la machine (`127.0.0.1`). Le fichier, dans `~/Cloud`, est copié sur le serveur Nextcloud de la même machine, puis sauvegardé chaque nuit avec 90 jours d'historique.
