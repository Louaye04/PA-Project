# Diffie-Hellman Mutual Authentication System

## 🔐 Architecture

Ce système implémente l'authentification mutuelle entre vendeurs et acheteurs via l'échange de clés Diffie-Hellman pour un chiffrement de bout en bout (E2E).

### Flux de Communication

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   ACHETEUR  │         │  PLATEFORME │         │   VENDEUR   │
│   (Buyer)   │         │   (Server)  │         │  (Seller)   │
└─────────────┘         └─────────────┘         └─────────────┘
      │                        │                        │
      │  1. Créer session DH   │                        │
      │───────────────────────>│                        │
      │     {sellerId,         │                        │
      │      buyerId,          │                        │
      │      productId}        │                        │
      │                        │                        │
      │  Params (n, g)         │                        │
      │<───────────────────────│                        │
      │                        │                        │
      │  2. Générer (x, X)     │                        │
      │     X = g^x mod n      │  3. Générer (y, Y)    │
      │                        │     Y = g^y mod n      │
      │                        │                        │
      │  Envoyer X             │                        │
      │───────────────────────>│  Envoyer Y             │
      │                        │<───────────────────────│
      │                        │                        │
      │  Recevoir Y            │  Recevoir X            │
      │<───────────────────────│───────────────────────>│
      │                        │                        │
      │  4. Calculer K         │                        │
      │     K = Y^x mod n      │  K = X^y mod n         │
      │                        │                        │
      │  5. Chiffrer message   │                        │
      │     avec K (AES-256)   │  Chiffrer message      │
      │                        │  avec K (AES-256)      │
      │                        │                        │
      │  Ciphertext + IV       │                        │
      │───────────────────────>│                        │
      │                        │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ >│
      │                        │  (Stockage chiffré)    │
      │                        │                        │
      │                        │  Ciphertext + IV       │
      │                        │<───────────────────────│
      │<───────────────────────│                        │
      │                        │                        │
      │  6. Déchiffrer         │                        │
      │     avec K             │  Déchiffrer avec K     │
      │                        │                        │
```

## 🛠️ Stack Technique

### Backend
- **Service**: `backend/services/diffie-hellman.service.js`
- **Controller**: `backend/controllers/dh.controller.js`
- **Routes**: `backend/routes/dh.routes.js`
- **Crypto**: Node.js `crypto` module (2048-bit DH, modp14)
- **Stockage**: In-memory (session + messages chiffrés)

### Frontend
- **Composant**: `frontend/src/components/SecureChat/SecureChat.jsx`
- **Crypto Client**: `frontend/src/utils/diffie-hellman.js`
- **API Client**: `frontend/src/utils/dh-api.js`
- **Crypto Web**: WebCrypto API (AES-256-GCM)
- **Math**: BigInt pour exponentiation modulaire

## 📡 API Endpoints

### POST `/api/dh/create-session`
Créer une session DH pour une transaction.
```json
{
  "sellerId": "seller@example.com",
  "buyerId": "buyer@example.com",
  "productId": "123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "abc123...",
    "params": {
      "prime": "FFFFFFFF...",  // n (2048 bits)
      "generator": "02"          // g
    }
  }
}
```

### POST `/api/dh/submit-seller-key`
Vendeur soumet sa clé publique X.
```json
{
  "sessionId": "abc123...",
  "publicKey": "A1B2C3..."  // X = g^x mod n
}
```

### POST `/api/dh/submit-buyer-key`
Acheteur soumet sa clé publique Y.
```json
{
  "sessionId": "abc123...",
  "publicKey": "D4E5F6..."  // Y = g^y mod n
}
```

### GET `/api/dh/session/:sessionId`
Récupérer les infos de session (avec clés publiques).
```json
{
  "sessionId": "abc123...",
  "status": "active",
  "params": { "prime": "...", "generator": "..." },
  "sellerPublicKey": "A1B2C3...",
  "buyerPublicKey": "D4E5F6...",
  "userRole": "buyer"
}
```

### POST `/api/dh/send-message`
Envoyer un message chiffré.
```json
{
  "sessionId": "abc123...",
  "encryptedData": {
    "ciphertext": "9F8E7D...",
    "iv": "1A2B3C...",
    "authTag": "4D5E6F..."
  }
}
```

### GET `/api/dh/messages/:sessionId`
Récupérer les messages chiffrés.
```json
{
  "success": true,
  "data": [
    {
      "id": "msg123",
      "fromUserId": "seller@example.com",
      "toUserId": "buyer@example.com",
      "encryptedContent": "9F8E7D...",
      "iv": "1A2B3C...",
      "authTag": "4D5E6F...",
      "timestamp": "2025-12-03T..."
    }
  ]
}
```

### GET `/api/dh/my-sessions`
Liste toutes les sessions DH de l'utilisateur.

## 🔑 Cryptographie

### Diffie-Hellman (2048-bit)
1. **Génération des paramètres publics**:
   - Prime `n`: 2048 bits (modp14 standard)
   - Générateur `g`: Typiquement 2 ou 5

2. **Génération des clés**:
   - **Vendeur**: Génère `x` (privé, 256 bits) → calcule `X = g^x mod n`
   - **Acheteur**: Génère `y` (privé, 256 bits) → calcule `Y = g^y mod n`

3. **Échange de clés**:
   - Vendeur envoie `X` à la plateforme
   - Acheteur envoie `Y` à la plateforme
   - Plateforme transmet `Y` au vendeur et `X` à l'acheteur

4. **Calcul du secret partagé**:
   - **Vendeur**: `K = Y^x mod n`
   - **Acheteur**: `K = X^y mod n`
   - **Résultat**: Les deux obtiennent la même clé `K` sans l'avoir transmise!

### AES-256-GCM
- **Dérivation de clé**: SHA-256(K) → clé AES 256-bit
- **Mode**: GCM (Galois/Counter Mode)
- **IV**: 12 bytes aléatoires par message
- **Auth Tag**: 128 bits pour l'intégrité
- **Chiffrement**: Client-side uniquement

## 🔒 Sécurité

### Ce que la plateforme NE PEUT PAS faire:
- ❌ Déchiffrer les messages (pas accès à K)
- ❌ Calculer K (ne connaît ni x ni y)
- ❌ Lire le contenu des conversations
- ❌ Modifier les messages sans détection (GCM Auth Tag)

### Ce que la plateforme PEUT faire:
- ✅ Voir les métadonnées (qui parle à qui, timestamps)
- ✅ Stocker les ciphertexts
- ✅ Relayer les messages chiffrés
- ✅ Gérer les sessions DH

### Propriétés de sécurité:
- **Confidentialité**: Messages chiffrés E2E avec AES-256-GCM
- **Intégrité**: Auth Tag GCM détecte toute modification
- **Forward Secrecy**: Nouvelle session = nouvelles clés
- **Authentification Mutuelle**: Les deux parties prouvent leur identité
- **Non-Répudiation**: Seul le détenteur de la clé privée peut déchiffrer

## 💻 Usage Frontend

### Ouvrir le chat sécurisé (Acheteur)
```jsx
import SecureChat from './components/SecureChat/SecureChat';

<SecureChat
  currentUser={{
    id: "buyer@example.com",
    email: "buyer@example.com",
    name: "Jean Dupont",
    role: "buyer"
  }}
  otherUser={{
    id: "seller@example.com",
    email: "seller@example.com",
    name: "BKH Store",
    role: "seller"
  }}
  productId="123"
  token={authToken}
  onClose={() => setSecureChatOpen(false)}
/>
```

### Fonctions crypto côté client
```javascript
import {
  generateDHKeyPair,
  computeSharedSecret,
  encryptMessage,
  decryptMessage
} from './utils/diffie-hellman';

// 1. Générer clés
const keys = await generateDHKeyPair(prime, generator);
// { privateKey: "abc...", publicKey: "def..." }

// 2. Calculer secret partagé
const sharedSecret = await computeSharedSecret(
  otherPublicKey,
  myPrivateKey,
  prime
);

// 3. Chiffrer message
const encrypted = await encryptMessage("Hello", sharedSecret);
// { ciphertext: "...", iv: "...", authTag: "..." }

// 4. Déchiffrer message
const plaintext = await decryptMessage(
  ciphertext,
  iv,
  authTag,
  sharedSecret
);
```

## 🎯 Cas d'Usage

### Acheteur initie une transaction sécurisée
1. Clic sur "🔐 Acheter avec Canal Sécurisé"
2. Session DH créée automatiquement
3. Échange de clés en arrière-plan (10-30 secondes)
4. Interface de chat s'affiche avec badge "🟢 Chiffré E2E"
5. Messages chiffrés localement avant envoi
6. Messages déchiffrés localement après réception

### Vendeur répond à une demande
1. Notification de nouvelle connexion sécurisée
2. Clic sur "🔐 Chat Sécurisé" dans la liste des commandes
3. Génération et échange de clés automatique
4. Chat E2E établi avec l'acheteur

## 📊 Logs & Debugging

Le système log chaque opération avec des emojis:
- 🔐 Session créée
- 🔑 Clé publique soumise
- ✅ Session active (échange complet)
- 💬 Message chiffré envoyé
- 🔒 Chiffrement
- 🔓 Déchiffrement
- 🧹 Nettoyage sessions expirées

### Exemple de logs:
```
🔐 [DH] Session DH créée: abc123
   Vendeur: seller@example.com
   Acheteur: buyer@example.com
   Expire: 2025-12-03T15:00:00Z

🔑 [DH] Vendeur seller@example.com a soumis sa clé publique X
   Session: abc123
   X: A1B2C3D4E5F6...

✅ [DH] Session abc123 est maintenant ACTIVE (échange complet)

💬 [DH] Message chiffré envoyé
   Session: abc123
   De: User seller@example.com → À: User buyer@example.com
   Ciphertext: 9F8E7D6C... (ILLISIBLE par la plateforme)
```

## 🔧 Configuration

### Backend (server.js)
```javascript
const dhRoutes = require('./routes/dh.routes');
app.use('/api/dh', dhRoutes);
```

### Frontend (BuyerDashboard.jsx / SellerDashboard.jsx)
```jsx
import SecureChat from '../SecureChat/SecureChat';

const [secureChatOpen, setSecureChatOpen] = useState(false);
const [chatProduct, setChatProduct] = useState(null);

// Bouton "Acheter avec Canal Sécurisé"
<button onClick={() => {
  setChatProduct(product);
  setSecureChatOpen(true);
}}>
  🔐 Acheter avec Canal Sécurisé
</button>
```

## ⚠️ Limitations Actuelles

1. **Stockage in-memory**: Les sessions expirent après 1 heure et ne survivent pas aux redémarrages serveur
2. **Pas de WebSocket**: Polling toutes les 2 secondes pour nouveaux messages
3. **Pas de notifications**: Pas d'alerte temps réel pour nouvelles connexions
4. **Sessions temporaires**: Pas de persistance des conversations

## 🚀 Améliorations Futures

### Phase 1: Production-Ready
- [ ] Migration vers base de données (MongoDB/PostgreSQL)
- [ ] WebSocket pour messages temps réel
- [ ] Notifications push pour nouvelles sessions
- [ ] Historique persistant des conversations

### Phase 2: Sécurité Avancée
- [ ] Rotation des clés périodique
- [ ] Détection d'attaque Man-in-the-Middle
- [ ] Vérification d'identité hors-bande (QR code)
- [ ] Audit trail complet

### Phase 3: Fonctionnalités
- [ ] Transfert de fichiers chiffrés
- [ ] Messages vocaux chiffrés
- [ ] Vidéo-conférence E2E
- [ ] Signature numérique des transactions

## 📚 Références

- [RFC 3526 - DH Groups](https://www.rfc-editor.org/rfc/rfc3526)
- [NIST SP 800-56A - DH Key Agreement](https://csrc.nist.gov/publications/detail/sp/800-56a/rev-3/final)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [AES-GCM](https://en.wikipedia.org/wiki/Galois/Counter_Mode)

---

**Implémenté le**: 3 décembre 2025  
**Auteur**: TP1 Security Team  
**Version**: 1.0.0
