const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const webhookService = require('../services/webhook.service');

/**
 * SSE endpoint - Le client se connecte ici pour recevoir les notifications en temps réel
 * GET /api/webhook/events
 */
router.get('/events', verifyToken, (req, res) => {
  const userId = req.userId; // Extrait par verifyToken
  
  // Configuration SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Pour nginx
  
  // Envoyer un message initial de connexion
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ message: 'Connecté au flux de notifications', userId })}\n\n`);
  
  // Enregistrer la connexion
  webhookService.registerConnection(userId, res);
  
  // Envoyer un heartbeat toutes les 30 secondes pour garder la connexion active
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch (err) {
      clearInterval(heartbeatInterval);
    }
  }, 30000);
  
  // Nettoyer l'intervalle quand le client se déconnecte
  req.on('close', () => {
    clearInterval(heartbeatInterval);
  });
});

/**
 * Endpoint pour obtenir les statistiques des connexions (admin)
 * GET /api/webhook/stats
 */
router.get('/stats', verifyToken, (req, res) => {
  const stats = webhookService.getStats();
  res.json({
    success: true,
    data: stats
  });
});

module.exports = router;
