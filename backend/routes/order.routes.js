const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const { verifyOrderOwnership } = require('../middleware/verifyOwnership.middleware');
const { body, param } = require('express-validator');

// Obtenir les commandes de l'utilisateur connecté
router.get(
  '/',
  authenticate,
  orderController.getMyOrders
);

// Obtenir les statistiques
router.get(
  '/stats',
  authenticate,
  orderController.getMyStats
);

// Obtenir une commande spécifique
router.get(
  '/:orderId',
  authenticate,
  [
    param('orderId').notEmpty().withMessage('ID de commande requis')
  ],
  // limiter les tentatives d'énumération sur les IDs de commande
  rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Trop de requêtes vers cet endpoint, ralentissez.' }),
  verifyOrderOwnership,
  orderController.getOrder
);

// Créer une nouvelle commande (acheteurs seulement)
router.post(
  '/',
  authenticate,
  checkPermission('orders','create'),
  [
    body('productId').notEmpty().withMessage('ID du produit requis'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantité doit être au moins 1')
  ],
  orderController.createOrder
);

// Mettre à jour le statut d'une commande
router.put(
  '/:orderId/status',
  authenticate,
  checkPermission('orders','update'),
  [
    param('orderId').notEmpty().withMessage('ID de commande requis'),
    body('status').notEmpty().withMessage('Statut requis')
  ],
  verifyOrderOwnership,
  orderController.updateOrderStatus
);

// Annuler une commande
router.post(
  '/:orderId/cancel',
  authenticate,
  checkPermission('orders','cancel'),
  [
    param('orderId').notEmpty().withMessage('ID de commande requis')
  ],
  verifyOrderOwnership,
  orderController.cancelOrder
);

module.exports = router;
