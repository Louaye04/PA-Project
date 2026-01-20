const express = require('express');
const router = express.Router();
const dhController = require('../controllers/dh.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const { body, param } = require('express-validator');

/**
 * Toutes les routes DH sont protégées par authentification
 */

/**
 * Créer une nouvelle session DH pour une transaction
 */
router.post(
  '/create-session',
  authenticate,
  checkPermission('dh','create'),
  [
    body('sellerId').notEmpty().withMessage('ID du vendeur requis'),
    body('buyerId').notEmpty().withMessage('ID de l\'acheteur requis'),
    body('productId').optional().isString().withMessage('ID du produit doit être une chaîne')
  ],
  dhController.createSession
);

/**
 * Vendeur soumet sa clé publique (X = g^x mod n)
 */
router.post(
  '/submit-seller-key',
  authenticate,
  [
    body('sessionId').notEmpty().withMessage('ID de session requis'),
    body('publicKey').notEmpty().withMessage('Clé publique requise')
  ],
  dhController.submitSellerKey
);

/**
 * Acheteur soumet sa clé publique (Y = g^y mod n)
 */
router.post(
  '/submit-buyer-key',
  authenticate,
  [
    body('sessionId').notEmpty().withMessage('ID de session requis'),
    body('publicKey').notEmpty().withMessage('Clé publique requise')
  ],
  dhController.submitBuyerKey
);

/**
 * Récupérer les informations d'une session spécifique
 */
router.get(
  '/session/:sessionId',
  authenticate,
  [
    param('sessionId').notEmpty().withMessage('ID de session requis')
  ],
  dhController.getSession
);

/**
 * Envoyer un message chiffré dans une session
 */
router.post(
  '/send-message',
  authenticate,
  checkPermission('dh','create'),
  [
    body('sessionId').notEmpty().withMessage('ID de session requis'),
    body('encryptedData').isObject().withMessage('Données chiffrées requises'),
    body('encryptedData.ciphertext').notEmpty().withMessage('Ciphertext requis'),
    body('encryptedData.iv').notEmpty().withMessage('IV requis'),
    body('encryptedData.authTag').notEmpty().withMessage('Auth tag requis')
  ],
  dhController.sendMessage
);

/**
 * Récupérer tous les messages chiffrés d'une session
 */
router.get(
  '/messages/:sessionId',
  authenticate,
  [
    param('sessionId').notEmpty().withMessage('ID de session requis')
  ],
  dhController.getMessages
);

/**
 * Récupérer toutes les sessions DH de l'utilisateur connecté
 */
router.get(
  '/my-sessions',
  authenticate,
  dhController.getMySessions
);

/**
 * Vérifier un challenge d'authentification mutuelle
 */
router.post(
  '/verify-challenge',
  authenticate,
  [
    body('sessionId').notEmpty().withMessage('ID de session requis'),
    body('challengeResponse').notEmpty().withMessage('Réponse au challenge requise')
  ],
  dhController.verifyChallenge
);

/**
 * Routes administrateur
 */

/**
 * Obtenir des statistiques sur les sessions DH (admin)
 */
router.get(
  '/stats',
  authenticate,
  checkPermission('dh','admin'),
  dhController.getStats
);

/**
 * Nettoyer les sessions expirées (admin)
 */
router.post(
  '/cleanup',
  authenticate,
  checkPermission('dh','admin'),
  dhController.cleanup
);

module.exports = router;
