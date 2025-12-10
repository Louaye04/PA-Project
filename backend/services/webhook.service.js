/**
 * Webhook Service - Server-Sent Events (SSE)
 * Permet au backend de pousser des notifications en temps réel aux clients
 * sans utiliser WebSocket
 */

// Stocker les connexions SSE actives par userId
const connections = new Map(); // userId -> Set de response objects

/**
 * Enregistrer une nouvelle connexion SSE
 */
exports.registerConnection = (userId, res) => {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  
  const userConnections = connections.get(userId);
  userConnections.add(res);
  
  console.log(`📡 [SSE] Client connecté: User ${userId} (Total: ${userConnections.size} connexions)`);
  
  // Nettoyer quand le client se déconnecte
  res.on('close', () => {
    userConnections.delete(res);
    if (userConnections.size === 0) {
      connections.delete(userId);
    }
    console.log(`📡 [SSE] Client déconnecté: User ${userId}`);
  });
};

/**
 * Envoyer une notification à un utilisateur spécifique
 */
exports.notifyUser = (userId, eventType, data) => {
  const userConnections = connections.get(userId);
  
  if (!userConnections || userConnections.size === 0) {
    console.log(`📡 [SSE] Aucune connexion active pour User ${userId}`);
    return false;
  }
  
  const message = JSON.stringify({
    type: eventType,
    data: data,
    timestamp: new Date().toISOString()
  });
  
  let sentCount = 0;
  userConnections.forEach(res => {
    try {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${message}\n\n`);
      sentCount++;
    } catch (err) {
      console.error(`📡 [SSE] Erreur envoi à User ${userId}:`, err.message);
      userConnections.delete(res);
    }
  });
  
  console.log(`📡 [SSE] Notification envoyée à User ${userId}: ${eventType} (${sentCount} connexions)`);
  return sentCount > 0;
};

/**
 * Envoyer une notification à tous les utilisateurs connectés
 */
exports.notifyAll = (eventType, data) => {
  let totalSent = 0;
  
  connections.forEach((userConnections, userId) => {
    const sent = exports.notifyUser(userId, eventType, data);
    if (sent) totalSent++;
  });
  
  console.log(`📡 [SSE] Notification broadcast: ${eventType} (${totalSent} utilisateurs)`);
  return totalSent;
};

/**
 * Notifier tous les vendeurs
 */
exports.notifyAllSellers = (eventType, data) => {
  // Pour l'instant, on notifie tous les utilisateurs connectés
  // Dans une vraie app, on filtrerait par rôle
  return exports.notifyAll(eventType, data);
};

/**
 * Notifier tous les acheteurs
 */
exports.notifyAllBuyers = (eventType, data) => {
  // Pour l'instant, on notifie tous les utilisateurs connectés
  // Dans une vraie app, on filtrerait par rôle
  return exports.notifyAll(eventType, data);
};

/**
 * Obtenir le nombre de connexions actives
 */
exports.getConnectionCount = () => {
  let total = 0;
  connections.forEach(userConnections => {
    total += userConnections.size;
  });
  return total;
};

/**
 * Obtenir les statistiques des connexions
 */
exports.getStats = () => {
  const stats = {
    totalUsers: connections.size,
    totalConnections: exports.getConnectionCount(),
    users: []
  };
  
  connections.forEach((userConnections, userId) => {
    stats.users.push({
      userId,
      connections: userConnections.size
    });
  });
  
  return stats;
};

console.log('📡 [SSE] Webhook service initialisé');
