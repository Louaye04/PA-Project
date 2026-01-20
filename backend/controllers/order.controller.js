const orderService = require('../services/order.service');
const productService = require('../services/product.service');
const { validationResult } = require('express-validator');

// Obtenir les commandes de l'utilisateur connecté
exports.getMyOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    
    let orders;
    if (role === 'buyer') {
      orders = orderService.getOrdersByBuyer(userId);
    } else if (role === 'seller') {
      orders = orderService.getOrdersBySeller(userId);
    } else if (role === 'admin') {
      orders = orderService.getAllOrders();
    } else {
      return res.status(403).json({
        error: 'Rôle non autorisé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir une commande par ID
exports.getOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = orderService.getOrderById(orderId);
    
    // Pour éviter l'énumération, renvoyer 404 lorsque la ressource n'existe
    // ou lorsque l'utilisateur n'y a pas accès (non-admin). Ainsi l'attaquant
    // ne peut pas distinguer "n'existe pas" vs "existe mais non autorisé".
    const userId = req.user.id;
    const role = req.user.role;

    if (!order || (role !== 'admin' && order.buyerId !== userId && order.sellerId !== userId)) {
      return res.status(404).json({
        error: 'Commande introuvable'
      });
    }
    
    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Créer une nouvelle commande (acheteurs seulement)
exports.createOrder = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation échouée',
        details: errors.array()
      });
    }
    
    // Vérifier que l'utilisateur est un acheteur
    if (req.user.role !== 'buyer') {
      return res.status(403).json({
        error: 'Seuls les acheteurs peuvent passer des commandes'
      });
    }
    
    const { productId, quantity } = req.body;
    
    // Vérifier que le produit existe et a assez de stock
    const product = productService.getProductById(productId);
    
    if (!product) {
      return res.status(404).json({
        error: 'Produit introuvable'
      });
    }
    
    if (product.stock < quantity) {
      return res.status(400).json({
        error: `Stock insuffisant. Stock disponible: ${product.stock}`
      });
    }
    
    // Créer la commande
    const order = orderService.createOrder({
      buyerId: req.user.id,
      buyerName: req.user.name || req.user.email,
      sellerId: product.sellerId,
      sellerName: product.sellerName,
      productId: product.id,
      productName: product.name,
      quantity,
      price: product.price
    });
    
    // Décrémenter le stock
    productService.decrementStock(productId, quantity);
    
    res.status(201).json({
      success: true,
      message: 'Commande créée avec succès',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Mettre à jour le statut d'une commande
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation échouée',
        details: errors.array()
      });
    }
    
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    const order = orderService.updateOrderStatus(orderId, userId, status);
    
    res.status(200).json({
      success: true,
      message: 'Statut de commande mis à jour',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Annuler une commande
exports.cancelOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    
    const order = orderService.cancelOrder(orderId, userId);
    
    res.status(200).json({
      success: true,
      message: 'Commande annulée',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Obtenir les statistiques (vendeurs et acheteurs)
exports.getMyStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    
    let stats;
    if (role === 'seller') {
      stats = orderService.getSellerStats(userId);
    } else if (role === 'buyer') {
      stats = orderService.getBuyerStats(userId);
    } else {
      return res.status(403).json({
        error: 'Statistiques non disponibles pour ce rôle'
      });
    }
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
