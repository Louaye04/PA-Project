**Contrôle d'accès (DAC) — Implémentation et démonstration**

Résumé
-------
Nous avons ajouté un modèle Discretionary Access Control (DAC) léger dans le backend. La configuration des permissions est centralisée dans `backend/config/permissions.js` et l'enforcement s'effectue via le middleware `backend/middleware/permission.middleware.js` (fonction `checkPermission(resource, action)`). Les routes sensibles (`products`, `orders`, `dh`) utilisent désormais ce middleware pour valider que l'utilisateur a un rôle autorisé avant d'exécuter l'action.

Fichiers ajoutés / modifiés
---------------------------
- `backend/config/permissions.js` : table centrale des permissions (ressource → action → rôles autorisés).
- `backend/middleware/permission.middleware.js` : middleware `checkPermission(resource, action)`.
- `backend/routes/product.routes.js` : utilise `checkPermission` sur création/mise à jour/suppression.
- `backend/routes/order.routes.js` : utilise `checkPermission` sur création/mise à jour/annulation.
- `backend/routes/dh.routes.js` : utilise `checkPermission` sur création/envoi et sur routes admin (stats, cleanup).

Table des autorisations (extrait)
---------------------------------
Ressource | Action   | Rôles autorisés
---------:|:--------:|:---------------
products  | read     | admin, seller, buyer, guest
products  | create   | seller, admin
products  | update   | seller, admin
products  | delete   | seller, admin
orders    | read     | admin, seller, buyer
orders    | create   | buyer, admin
orders    | update   | seller, admin
orders    | cancel   | buyer, admin
dh        | read     | admin, seller, buyer
dh        | create   | seller, buyer
dh        | admin    | admin

Notes d'implémentation
----------------------
- Le middleware `checkPermission` lit le rôle de l'utilisateur depuis `req.userRoles` (rempli par `authenticate` / `verifyToken` dans `auth.middleware.js`).
- Certaines vérifications d'appartenance/ownership (par ex. vendeur propriétaire d'un produit) sont réalisées au niveau du service (ex. `product.service.js` vérifie `sellerId` pour update/delete). Le middleware DAC sert de couche centrale déclarative + documentée.

Comment démontrer l'intégration à la prof
----------------------------------------
1. Lancer le backend : `start-backend.ps1` (ou `npm start` depuis `backend`) et vérifier que le serveur écoute sur le port configuré (ex. 5000). Exemple :

```powershell
cd C:\Users\haffa\Downloads\TP1\backend
.\n+start-backend.ps1
```

2. Montrer la configuration : ouvrir `backend/config/permissions.js` à la prof pour expliquer la table des autorisations.

3. Exemples de requêtes à effectuer en direct (utiliser `curl` ou Postman) :

- Tentative de création de produit avec un token d'`acheteur` (doit échouer, 403) :

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <TOKEN_BUYER>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","price":100,"stock":1}'
```

- Création de produit avec un token de `seller` (doit réussir, 201).

- Tentative de suppression par un vendeur non propriétaire (doit échouer, 403). Puis suppression par le `seller` propriétaire (doit réussir).

- Appeler une route admin (ex. `POST /api/dh/cleanup`) avec un token non-admin (doit échouer) puis avec token admin (doit réussir).

4. Montrer les routes modifiées : ouvrir `backend/routes/product.routes.js` et pointer le `checkPermission('products','create')` — cela montre que l'autorisation est explicitement appliquée sur l'endpoint.

5. Facultatif — Journalisation : le service produit loggue déjà la création / suppression / maj; on peut ajouter des logs supplémentaires pour les refus d'accès si souhaité.

Modèle de Table des autorisations (format à remettre)
---------------------------------------------------
Vous pouvez copier la table ci-dessus dans un document Word/PDF à remettre à la prof. Si vous préférez, je génère un `backend/DAC-table.csv` ou `backend/DAC.pdf` automatiquement.

Questions / améliorations possibles
----------------------------------
- ajouter une UI d'administration pour gérer `permissions.js` dynamiquement (stockée en fichier ou DB).
- ajouter des tests automatisés (unitaires/integration) qui vérifient que les routes retournent 403/200 selon les rôles.
