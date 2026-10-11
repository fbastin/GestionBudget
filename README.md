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

### Tests
Les tests du backend utilisent une base temporaire : ils ne touchent jamais `backend/finance.db`.

```bash
cd backend
source venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

## 📂 Structure du Projet

- `/backend` : API Python, modèles de données et base de données SQLite.
- `/frontend` : Application React avec tableau de bord et graphiques.

## 📈 Fonctionnalités Actuelles (MVP)

- **Tableau de bord** : Vue d'ensemble des Actifs, Passifs et Valeur Nette.
- **Suivi des Dettes** : Liste détaillée et graphique d'évolution historique.
- **Gestion du Patrimoine** : Centralisation des biens immobiliers et comptes bancaires.
- **Investissements** : Répertoire des stocks et dividendes canadiens.

## 🔒 Confidentialité
Toutes les données sont stockées localement dans le fichier `backend/finance.db`. Aucune donnée ne quitte votre machine.
