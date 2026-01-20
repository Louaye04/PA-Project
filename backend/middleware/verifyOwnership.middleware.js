const orderService = require('../services/order.service');

/**
 * Middleware spécifique pour vérifier la propriété d'une commande
 * Renvoie 404 si la commande n'existe pas ou si l'utilisateur n'en est pas propriétaire
 */
exports.verifyOrderOwnership = (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = orderService.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentification requise' });
    }

    // Admins peuvent accéder
    if (user.role === 'admin' || (user.roles && user.roles.includes('admin'))) {
      req.order = order;
      return next();
    }

    // Vérifier propriété (sellerId ou buyerId)
    const ownerMatch = String(order.sellerId) === String(user.id) || String(order.buyerId) === String(user.id);
    if (!ownerMatch) {
      // Retourner 404 pour masquer l'existence de la ressource
      return res.status(404).json({ error: 'Commande introuvable' });
    }

    req.order = order;
    next();
  } catch (err) {
    next(err);
  }
};
