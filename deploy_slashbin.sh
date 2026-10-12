#!/bin/bash
# Publie l'application sur https://slashbin.net/budget/ (accès réservé au propriétaire du site).
#
# - le frontend est compilé pour vivre sous /budget : fichiers servis depuis /budget/app/,
#   appels à l'API par /budget/api.php, qui vérifie la session puis relaie vers le backend ;
# - le backend tourne en service systemd utilisateur (budget.service, 127.0.0.1:8020) sur
#   backend/finance.db ; le redémarrer applique les nouvelles migrations, après sauvegarde.
#
# Les pages PHP (index.php, api.php) sont dans le dépôt de slashbin.net, pas ici.

set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
CIBLE=/var/www/slashbin.net/budget/app

cd "$BASE_DIR/frontend"
VITE_API_URL=/budget/api.php VITE_ROUTER_BASENAME=/budget npm run build -- --base=/budget/app/

# --exclude : le .htaccess de la cible n'est pas produit par la compilation, --delete l'effacerait.
rsync -a --delete --exclude=.htaccess dist/ "$CIBLE/"

systemctl --user restart budget.service
for _ in $(seq 1 20); do
    if curl -s -m 2 -o /dev/null http://127.0.0.1:8020/; then
        echo "Publié : https://slashbin.net/budget/"
        exit 0
    fi
    sleep 1
done
echo "Le backend ne répond pas : journalctl --user -u budget.service" >&2
exit 1
