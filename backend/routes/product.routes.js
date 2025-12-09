const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body, param } = require('express-validator');

// Obtenir tous les produits (accessible à tous les utilisateurs authentifiés)
router.get(
  '/',
  authenticate,
  productController.getAllProducts
);

// Obtenir les produits du vendeur connecté
router.get(
  '/my-products',
  authenticate,
  productController.getMyProducts
);

// Obtenir un produit spécifique
router.get(
  '/:productId',
  authenticate,
  [
    param('productId').notEmpty().withMessage('ID du produit requis')
  ],
  productController.getProduct
);

// Créer un nouveau produit (vendeurs seulement)
router.post(
  '/',
  authenticate,
  [
    body('name').notEmpty().withMessage('Nom du produit requis'),
    body('price').isNumeric().withMessage('Prix doit être un nombre'),
    body('stock').optional().isNumeric().withMessage('Stock doit être un nombre'),
    body('desc').optional().isString().withMessage('Description doit être une chaîne')
  ],
  productController.createProduct
);

// Mettre à jour un produit
router.put(
  '/:productId',
  authenticate,
  [
    param('productId').notEmpty().withMessage('ID du produit requis'),
    body('name').optional().notEmpty().withMessage('Nom ne peut pas être vide'),
    body('price').optional().isNumeric().withMessage('Prix doit être un nombre'),
    body('stock').optional().isNumeric().withMessage('Stock doit être un nombre'),
    body('desc').optional().isString().withMessage('Description doit être une chaîne')
  ],
  productController.updateProduct
);

// Supprimer un produit
router.delete(
  '/:productId',
  authenticate,
  [
    param('productId').notEmpty().withMessage('ID du produit requis')
  ],
  productController.deleteProduct
);

module.exports = router;
