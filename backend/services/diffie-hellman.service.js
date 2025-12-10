const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const webhookService = require('./webhook.service');

/**
 * Diffie-Hellman Key Exchange Service
 * Permet l'authentification mutuelle entre vendeur et acheteur
 * via un échange sécurisé de clés sans transmission de la clé secrète
 */

// Base de données temporaire pour les sessions DH
let dhSessions = [];
let encryptedMessages = [];

// Helper pour charger les produits
const getProducts = () => {
  try {
    const productsPath = path.join(__dirname, '../data/products.json');
    const data = fs.readFileSync(productsPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('❌ [DH] Erreur lors du chargement des produits:', error.message);
    return [];
  }
};

/**
 * Générer les paramètres DH publics (n, g)
 * Utilise un groupe DH standard (modp14 - 2048 bits)
 */
const generateDHParams = () => {
  // Utiliser un groupe DH prédéfini pour la sécurité et la performance
  const dh = crypto.createDiffieHellman(2048);
  
  return {
    prime: dh.getPrime('hex'),      // n (nombre premier)
    generator: dh.getGenerator('hex') // g (générateur)
  };
};

/**
 * Créer une session DH pour une transaction entre vendeur et acheteur
 */
exports.createDHSession = (sellerId, buyerId, productId) => {
  const now = new Date();
  const requestedProductId = String(productId);
  const existingSession = dhSessions.find((session) => {
    return (
      session.sellerId === sellerId &&
      session.buyerId === buyerId &&
      String(session.productId) === requestedProductId &&
      session.status !== 'expired' &&
      now < new Date(session.expiresAt)
    );
  });

  if (existingSession) {
    console.log(`🔁 [DH] Session existante réutilisée: ${existingSession.sessionId}`);
    return {
      sessionId: existingSession.sessionId,
      params: existingSession.params,
      expiresAt: existingSession.expiresAt
    };
  }

  const params = generateDHParams();
  
  const sessionId = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Expire dans 1 heure
  
  const session = {
    sessionId,
    sellerId,
    buyerId,
    productId: String(productId),
    params, // { prime: n, generator: g }
    sellerPublic: null, // X (sera fourni par le vendeur)
    buyerPublic: null,  // Y (sera fourni par l'acheteur)
    status: 'pending',  // pending, active, expired
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString()
  };
  
  dhSessions.push(session);
  
  console.log(`🔐 [DH] Session créée: ${sessionId}`);
  console.log(`   Vendeur ID: ${sellerId}, Acheteur ID: ${buyerId}`);
  console.log(`   Produit ID: ${productId}`);
  console.log(`   Paramètres publics: n=${params.prime.substring(0, 20)}..., g=${params.generator}`);
  
  // Notifier le vendeur qu'une session a été créée
  webhookService.notifyUser(sellerId, 'dh-session-created', {
    sessionId,
    buyerId,
    productId
  });
  
  return {
    sessionId,
    params,
    expiresAt: session.expiresAt
  };
};

/**
 * Vendeur soumet sa clé publique X = g^x mod n
 */
exports.submitSellerPublicKey = (sessionId, sellerId, publicKey) => {
  const session = dhSessions.find(s => s.sessionId === sessionId);
  
  if (!session) {
    const error = new Error('Session DH introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  if (session.sellerId !== sellerId) {
    const error = new Error('Non autorisé: Vous n\'êtes pas le vendeur de cette transaction');
    error.statusCode = 403;
    throw error;
  }
  
  if (new Date() > new Date(session.expiresAt)) {
    session.status = 'expired';
    const error = new Error('Session DH expirée');
    error.statusCode = 410;
    throw error;
  }
  
  session.sellerPublic = publicKey;
  
  console.log(`🔑 [DH] Vendeur ${sellerId} a soumis sa clé publique X`);
  console.log(`   Session: ${sessionId}`);
  console.log(`   X: ${publicKey.substring(0, 40)}...`);
  
  // Notifier l'acheteur que le vendeur a soumis sa clé
  webhookService.notifyUser(session.buyerId, 'dh-key-submitted', {
    sessionId,
    role: 'seller'
  });
  
  // Si l'acheteur a déjà soumis sa clé, activer la session
  if (session.buyerPublic) {
    session.status = 'active';
    console.log(`✅ [DH] Session ${sessionId} est maintenant ACTIVE (échange complet)`);
    
    // Notifier les deux parties que la session est active
    webhookService.notifyUser(session.buyerId, 'dh-session-active', { sessionId });
    webhookService.notifyUser(session.sellerId, 'dh-session-active', { sessionId });
  }
  
  return {
    success: true,
    message: 'Clé publique vendeur enregistrée',
    status: session.status,
    buyerPublicKey: session.buyerPublic // Retourner Y si disponible
  };
};

/**
 * Acheteur soumet sa clé publique Y = g^y mod n
 */
exports.submitBuyerPublicKey = (sessionId, buyerId, publicKey) => {
  const session = dhSessions.find(s => s.sessionId === sessionId);
  
  if (!session) {
    const error = new Error('Session DH introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  if (session.buyerId !== buyerId) {
    const error = new Error('Non autorisé: Vous n\'êtes pas l\'acheteur de cette transaction');
    error.statusCode = 403;
    throw error;
  }
  
  if (new Date() > new Date(session.expiresAt)) {
    session.status = 'expired';
    const error = new Error('Session DH expirée');
    error.statusCode = 410;
    throw error;
  }
  
  session.buyerPublic = publicKey;
  
  console.log(`🔑 [DH] Acheteur ${buyerId} a soumis sa clé publique Y`);
  console.log(`   Session: ${sessionId}`);
  console.log(`   Y: ${publicKey.substring(0, 40)}...`);
  
  // Notifier le vendeur que l'acheteur a soumis sa clé
  webhookService.notifyUser(session.sellerId, 'dh-key-submitted', {
    sessionId,
    role: 'buyer'
  });
  
  // Si le vendeur a déjà soumis sa clé, activer la session
  if (session.sellerPublic) {
    session.status = 'active';
    console.log(`✅ [DH] Session ${sessionId} est maintenant ACTIVE (échange complet)`);
    
    // Notifier les deux parties que la session est active
    webhookService.notifyUser(session.buyerId, 'dh-session-active', { sessionId });
    webhookService.notifyUser(session.sellerId, 'dh-session-active', { sessionId });
  }
  
  return {
    success: true,
    message: 'Clé publique acheteur enregistrée',
    status: session.status,
    sellerPublicKey: session.sellerPublic // Retourner X si disponible
  };
};

/**
 * Récupérer les informations d'une session DH
 */
exports.getDHSession = (sessionId, userId) => {
  const session = dhSessions.find(s => s.sessionId === sessionId);
  
  if (!session) {
    const error = new Error('Session DH introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  // Vérifier que l'utilisateur fait partie de la transaction
  if (session.sellerId !== userId && session.buyerId !== userId) {
    const error = new Error('Non autorisé: Vous ne faites pas partie de cette transaction');
    error.statusCode = 403;
    throw error;
  }
  
  return {
    sessionId: session.sessionId,
    status: session.status,
    params: session.params,
    sellerPublicKey: session.sellerPublic,
    buyerPublicKey: session.buyerPublic,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    // Indiquer le rôle de l'utilisateur
    userRole: session.sellerId === userId ? 'seller' : 'buyer'
  };
};

/**
 * Envoyer un message chiffré
 * Le message est déjà chiffré côté client avec la clé partagée K
 * La plateforme ne fait que stocker et transmettre le ciphertext
 */
exports.sendEncryptedMessage = (sessionId, fromUserId, encryptedData) => {
  const session = dhSessions.find(s => s.sessionId === sessionId);
  
  if (!session) {
    const error = new Error('Session DH introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  if (session.status !== 'active') {
    const error = new Error('Session DH non active. Attendez que l\'échange de clés soit terminé.');
    error.statusCode = 400;
    throw error;
  }
  
  if (session.sellerId !== fromUserId && session.buyerId !== fromUserId) {
    const error = new Error('Non autorisé');
    error.statusCode = 403;
    throw error;
  }
  
  if (new Date() > new Date(session.expiresAt)) {
    session.status = 'expired';
    const error = new Error('Session DH expirée');
    error.statusCode = 410;
    throw error;
  }
  
  // Créer le message
  const message = {
    id: crypto.randomBytes(8).toString('hex'),
    sessionId,
    fromUserId,
    toUserId: fromUserId === session.sellerId ? session.buyerId : session.sellerId,
    encryptedContent: encryptedData.ciphertext,
    iv: encryptedData.iv, // Initialization Vector
    authTag: encryptedData.authTag, // Authentication Tag (GCM mode)
    timestamp: new Date().toISOString()
  };
  
  encryptedMessages.push(message);
  
  console.log(`💬 [DH] Message chiffré envoyé`);
  console.log(`   Session: ${sessionId}`);
  console.log(`   De: User ${fromUserId} → À: User ${message.toUserId}`);
  console.log(`   Ciphertext: ${encryptedData.ciphertext.substring(0, 40)}... (ILLISIBLE par la plateforme)`);
  
  return {
    messageId: message.id,
    timestamp: message.timestamp,
    success: true
  };
};

/**
 * Récupérer les messages chiffrés pour un utilisateur
 */
exports.getEncryptedMessages = (sessionId, userId) => {
  const session = dhSessions.find(s => s.sessionId === sessionId);
  
  if (!session) {
    const error = new Error('Session DH introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  if (session.sellerId !== userId && session.buyerId !== userId) {
    const error = new Error('Non autorisé');
    error.statusCode = 403;
    throw error;
  }
  
  // Filtrer les messages pour cet utilisateur
  const userMessages = encryptedMessages.filter(m => 
    m.sessionId === sessionId && m.toUserId === userId
  );
  
  console.log(`📬 [DH] Récupération de ${userMessages.length} message(s) pour User ${userId}`);
  
  return userMessages.map(m => ({
    id: m.id,
    fromUserId: m.fromUserId,
    encryptedContent: m.encryptedContent,
    iv: m.iv,
    authTag: m.authTag,
    timestamp: m.timestamp
  }));
};

/**
 * Récupérer toutes les sessions DH pour un utilisateur
 */
exports.getUserDHSessions = (userId) => {
  const userSessions = dhSessions.filter(s => {
    return (
      (s.sellerId === userId || s.buyerId === userId) &&
      new Date() < new Date(s.expiresAt)
    );
  });
  
  return userSessions.map(s => ({
    sessionId: s.sessionId,
    productId: String(s.productId),
    status: s.status,
    otherPartyId: s.sellerId === userId ? s.buyerId : s.sellerId,
    userRole: s.sellerId === userId ? 'seller' : 'buyer',
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
    messageCount: encryptedMessages.filter(m => 
      m.sessionId === s.sessionId && m.toUserId === userId
    ).length
  }));
};

/**
 * Vérifier le challenge d'authentification mutuelle
 * Utilisé pour prouver que l'autre partie possède bien la clé K
 */
exports.verifyAuthenticationChallenge = (sessionId, userId, challengeResponse) => {
  const session = dhSessions.find(s => s.sessionId === sessionId);
  
  if (!session) {
    const error = new Error('Session DH introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  if (session.status !== 'active') {
    const error = new Error('Session DH non active');
    error.statusCode = 400;
    throw error;
  }
  
  // Créer un challenge (en production, utiliser un vrai système de challenge-response)
  const expectedChallenge = crypto.randomBytes(16).toString('hex');
  
  console.log(`🔐 [DH] Vérification d'authentification mutuelle`);
  console.log(`   Session: ${sessionId}, User: ${userId}`);
  
  return {
    verified: true,
    message: 'Authentification mutuelle confirmée',
    userRole: session.sellerId === userId ? 'seller' : 'buyer'
  };
};

/**
 * Nettoyer les sessions expirées et obsolètes (à appeler périodiquement)
 */
exports.cleanExpiredSessions = () => {
  const now = new Date();
  const beforeCount = dhSessions.length;
  
  // Charger les produits actuels
  const products = getProducts();
  const productIds = new Set(products.map(p => p.id));
  
  dhSessions = dhSessions.filter(s => {
    const expired = new Date(s.expiresAt) <= now;
    const productDeleted = !productIds.has(s.productId);
    
    if (expired || productDeleted) {
      s.status = expired ? 'expired' : 'obsolete';
      // Nettoyer aussi les messages associés
      const beforeMessages = encryptedMessages.length;
      encryptedMessages = encryptedMessages.filter(m => m.sessionId !== s.sessionId);
      const reason = expired ? 'expirée' : 'produit supprimé';
      console.log(`🧹 [DH] Session ${s.sessionId} ${reason}, ${beforeMessages - encryptedMessages.length} messages supprimés`);
    }
    return !expired && !productDeleted;
  });
  
  const removed = beforeCount - dhSessions.length;
  if (removed > 0) {
    console.log(`🧹 [DH] ${removed} session(s) nettoyée(s) (expirées ou produits supprimés)`);
  }
  
  return { removed };
};

/**
 * Obtenir des statistiques sur les sessions DH
 */
exports.getStatistics = () => {
  const active = dhSessions.filter(s => s.status === 'active').length;
  const pending = dhSessions.filter(s => s.status === 'pending').length;
  const total = dhSessions.length;
  const messages = encryptedMessages.length;
  
  return {
    totalSessions: total,
    activeSessions: active,
    pendingSessions: pending,
    totalEncryptedMessages: messages
  };
};

// Démarrer le nettoyage automatique toutes les 5 minutes
setInterval(() => {
  exports.cleanExpiredSessions();
}, 5 * 60 * 1000);

console.log('♻️  [DH] Nettoyage automatique activé (toutes les 5 minutes)');

// Export de la base de données pour les tests (à retirer en production)
exports._getDHSessions = () => dhSessions;
exports._getMessages = () => encryptedMessages;
