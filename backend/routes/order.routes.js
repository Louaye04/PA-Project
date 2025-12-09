const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');
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
  orderController.getOrder
);

// Créer une nouvelle commande (acheteurs seulement)
router.post(
  '/',
  authenticate,
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
  [
    param('orderId').notEmpty().withMessage('ID de commande requis'),
    body('status').notEmpty().withMessage('Statut requis')
  ],
  orderController.updateOrderStatus
);

// Annuler une commande
router.post(
  '/:orderId/cancel',
  authenticate,
  [
    param('orderId').notEmpty().withMessage('ID de commande requis')
  ],
  orderController.cancelOrder
);

module.exports = router;
