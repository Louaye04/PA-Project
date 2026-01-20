**DAC Tests — Guide d'utilisation et résultats attendus**

Ce document explique comment utiliser le script `scripts/dac-tests.ps1` pour valider l'intégration du modèle DAC dans l'application.

Prérequis
---------
- Backend démarré sur `http://localhost:5000`.
- Avoir des tokens JWT pour différents rôles : seller owner, autre seller, buyer, admin.

Variables d'environnement à définir avant d'exécuter :

- `TOKEN_SELLER_OWNER` : token JWT du vendeur qui deviendra propriétaire du produit créé.
- `TOKEN_SELLER_OTHER` : token JWT d'un autre vendeur (non propriétaire).
- `TOKEN_BUYER` : token JWT d'un acheteur.
- `TOKEN_ADMIN` : token JWT d'un administrateur.

Exécution (PowerShell)
----------------------
Ouvrez une fenêtre PowerShell et exécutez :

```powershell
cd C:\Users\haffa\Downloads\TP1
$env:TOKEN_SELLER_OWNER = '<TOKEN_SELLER_OWNER>'
$env:TOKEN_SELLER_OTHER = '<TOKEN_SELLER_OTHER>'
$env:TOKEN_BUYER = '<TOKEN_BUYER>'
$env:TOKEN_ADMIN = '<TOKEN_ADMIN>'
.\scripts\dac-tests.ps1
```

Tests effectués et résultats attendus
------------------------------------
- GET /api/products (public) → 200 OK
- POST /api/products en tant que `buyer` → 403 Forbidden (buyer ne peut pas créer de produit)
- POST /api/products en tant que `seller owner` → 201 Created (crée un produit et retourne son id)
- DELETE /api/products/:id en tant que `seller other` → 403 Forbidden (non propriétaire)
- DELETE /api/products/:id en tant que `seller owner` → 200 OK (propriétaire peut supprimer)
- POST /api/dh/cleanup en tant que non-admin → 403 Forbidden
- POST /api/dh/cleanup en tant que `admin` → 200 OK (action admin autorisée)

Notes
-----
- Le script lit/écrit les tokens depuis les variables d'environnement pour ne pas stocker de secrets dans le fichier.
- Si vous n'avez pas plusieurs comptes, vous pouvez générer des tokens via `backend/scripts/generate_token_for_user.js` (si présent) ou via la route d'authentification du backend.

Remise à la prof
----------------
1. Commencez le backend (`start-backend.ps1`).
2. Ouvrez `backend/config/permissions.js` et `backend/middleware/permission.middleware.js` pour expliquer la logique.
3. Lancez le script `scripts/dac-tests.ps1` devant la prof avec les tokens appropriés et montrez les lignes `OK/FAIL`.
