const dhService = require('../services/diffie-hellman.service');
const { validationResult } = require('express-validator');

/**
 * Créer une nouvelle session Diffie-Hellman
 * POST /api/dh/create-session
 */
exports.createSession = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation échouée',
        details: errors.array()
      });
    }

    const { sellerId, buyerId, productId } = req.body;
    const userId = req.user.id; // De l'auth middleware

    // Vérifier que l'utilisateur est soit le vendeur soit l'acheteur
    if (userId !== sellerId && userId !== buyerId) {
      return res.status(403).json({
        error: 'Non autorisé: Vous devez être soit le vendeur soit l\'acheteur'
      });
    }

    const result = dhService.createDHSession(sellerId, buyerId, productId);

    res.status(201).json({
      success: true,
      message: 'Session DH créée avec succès',
      data: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Soumettre la clé publique du vendeur (X)
 * POST /api/dh/submit-seller-key
 */
exports.submitSellerKey = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation échouée',
        details: errors.array()
      });
    }

    const { sessionId, publicKey } = req.body;
    const sellerId = req.user.id;

    const result = dhService.submitSellerPublicKey(sessionId, sellerId, publicKey);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Soumettre la clé publique de l'acheteur (Y)
 * POST /api/dh/submit-buyer-key
 */
exports.submitBuyerKey = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation échouée',
        details: errors.array()
      });
    }

    const { sessionId, publicKey } = req.body;
    const buyerId = req.user.id;

    const result = dhService.submitBuyerPublicKey(sessionId, buyerId, publicKey);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les informations d'une session DH
 * GET /api/dh/session/:sessionId
 */
exports.getSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const session = dhService.getDHSession(sessionId, userId);

    res.status(200).json({
      success: true,
      data: session
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Envoyer un message chiffré
 * POST /api/dh/send-message
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation échouée',
        details: errors.array()
      });
    }

    const { sessionId, encryptedData } = req.body;
    const fromUserId = req.user.id;

    // encryptedData doit contenir: { ciphertext, iv, authTag }
    if (!encryptedData.ciphertext || !encryptedData.iv || !encryptedData.authTag) {
      return res.status(400).json({
        error: 'Données de chiffrement incomplètes (ciphertext, iv, authTag requis)'
      });
    }

    const result = dhService.sendEncryptedMessage(sessionId, fromUserId, encryptedData);

    res.status(201).json({
      success: true,
      message: 'Message chiffré envoyé',
      data: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer les messages chiffrés
 * GET /api/dh/messages/:sessionId
 */
exports.getMessages = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const messages = dhService.getEncryptedMessages(sessionId, userId);

    res.status(200).json({
      success: true,
      data: messages
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Récupérer toutes les sessions DH de l'utilisateur
 * GET /api/dh/my-sessions
 */
exports.getMySessions = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const sessions = dhService.getUserDHSessions(userId);

    res.status(200).json({
      success: true,
      data: sessions
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Vérifier le challenge d'authentification mutuelle
 * POST /api/dh/verify-challenge
 */
exports.verifyChallenge = async (req, res, next) => {
  try {
    const { sessionId, challengeResponse } = req.body;
    const userId = req.user.id;

    const result = dhService.verifyAuthenticationChallenge(sessionId, userId, challengeResponse);

    res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtenir des statistiques (admin uniquement)
 * GET /api/dh/stats
 */
exports.getStats = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Accès réservé aux administrateurs'
      });
    }

    const stats = dhService.getStatistics();

    res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Nettoyer les sessions expirées (admin uniquement)
 * POST /api/dh/cleanup
 */
exports.cleanup = async (req, res, next) => {
  try {
    // Vérifier que l'utilisateur est admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Accès réservé aux administrateurs'
      });
    }

    const result = dhService.cleanExpiredSessions();

    res.status(200).json({
      success: true,
      message: `${result.removed} session(s) expirée(s) nettoyée(s)`,
      data: result
    });

  } catch (error) {
    next(error);
  }
};
