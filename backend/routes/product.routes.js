const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { checkPermission } = require('../middleware/permission.middleware');
const { body, param } = require('express-validator');

// Obtenir tous les produits (accessible à tous les utilisateurs authentifiés)
// Liste publique des produits (accessible sans authentification)
router.get('/', productController.getAllProducts);

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
  checkPermission('products','create'),
  [
    body('name').notEmpty().withMessage('Nom du produit requis'),
    body('price').custom((value) => {
      if (typeof value === 'number' && !isNaN(value)) return true;
      if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) return true;
      throw new Error('Prix doit être un nombre');
    }),
    body('stock').optional().custom((value) => {
      if (value === undefined || value === null || value === '') return true;
      if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return true;
      if (typeof value === 'string' && value.trim() !== '' && Number.isInteger(Number(value))) return true;
      throw new Error('Stock doit être un nombre entier >= 0');
    }),
    body('desc').optional().isString().withMessage('Description doit être une chaîne')
  ],
  productController.createProduct
);

// Mettre à jour un produit
router.put(
  '/:productId',
  authenticate,
  checkPermission('products','update'),
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
  checkPermission('products','delete'),
  [
    param('productId').notEmpty().withMessage('ID du produit requis')
  ],
  productController.deleteProduct
);

module.exports = router;
