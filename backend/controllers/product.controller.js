const productService = require('../services/product.service');
const { validationResult } = require('express-validator');

// Obtenir tous les produits (pour acheteurs)
exports.getAllProducts = async (req, res, next) => {
  try {
    const products = productService.getAllProducts();
    
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir les produits d'un vendeur
exports.getMyProducts = async (req, res, next) => {
  try {
    const sellerId = req.user.id;
    const products = productService.getProductsBySeller(sellerId);
    
    res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir un produit par ID
exports.getProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = productService.getProductById(productId);
    
    if (!product) {
      return res.status(404).json({
        error: 'Produit introuvable'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Créer un nouveau produit (vendeurs seulement)
exports.createProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation échouée',
        details: errors.array()
      });
    }
    
    // Vérifier que l'utilisateur est un vendeur
    if (req.user.role !== 'seller') {
      return res.status(403).json({
        error: 'Seuls les vendeurs peuvent créer des produits'
      });
    }
    
    const { name, price, stock, desc } = req.body;
    
    const product = productService.createProduct({
      name,
      price,
      stock,
      desc,
      sellerId: req.user.id,
      sellerName: req.user.name || req.user.email
    });
    
    res.status(201).json({
      success: true,
      message: 'Produit créé avec succès',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Mettre à jour un produit
exports.updateProduct = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation échouée',
        details: errors.array()
      });
    }
    
    const { productId } = req.params;
    const sellerId = req.user.id;
    const updates = req.body;
    
    const product = productService.updateProduct(productId, sellerId, updates);
    
    res.status(200).json({
      success: true,
      message: 'Produit mis à jour',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// Supprimer un produit
exports.deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const sellerId = req.user.id;
    
    const product = productService.deleteProduct(productId, sellerId);
    
    res.status(200).json({
      success: true,
      message: 'Produit supprimé',
      data: product
    });
  } catch (error) {
    next(error);
  }
};
