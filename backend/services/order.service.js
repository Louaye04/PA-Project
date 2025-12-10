const fs = require('fs');
const path = require('path');
const webhookService = require('./webhook.service');

const ORDERS_FILE = path.join(__dirname, '../data/orders.json');

// Helper: Lire les commandes
const readOrders = () => {
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading orders:', error);
    return [];
  }
};

// Helper: Écrire les commandes
const writeOrders = (orders) => {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing orders:', error);
    return false;
  }
};

// Obtenir toutes les commandes
exports.getAllOrders = () => {
  return readOrders();
};

// Obtenir les commandes d'un acheteur
exports.getOrdersByBuyer = (buyerId) => {
  const orders = readOrders();
  return orders.filter(o => o.buyerId === buyerId);
};

// Obtenir les commandes d'un vendeur
exports.getOrdersBySeller = (sellerId) => {
  const orders = readOrders();
  return orders.filter(o => o.sellerId === sellerId);
};

// Obtenir une commande par ID
exports.getOrderById = (orderId) => {
  const orders = readOrders();
  return orders.find(o => o.id === orderId);
};

// Créer une nouvelle commande
exports.createOrder = (orderData) => {
  const orders = readOrders();
  
  const newOrder = {
    id: Date.now().toString(),
    buyerId: orderData.buyerId,
    buyerName: orderData.buyerName,
    sellerId: orderData.sellerId,
    sellerName: orderData.sellerName,
    productId: orderData.productId,
    productName: orderData.productName,
    quantity: orderData.quantity || 1,
    price: orderData.price,
    totalPrice: orderData.price * (orderData.quantity || 1),
    status: 'En attente', // En attente, En cours, Livrée, Annulée
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  orders.push(newOrder);
  writeOrders(orders);
  
  console.log('✅ [Orders] Commande créée:', newOrder.id);
  
  // Notifier le vendeur de la nouvelle commande
  webhookService.notifyUser(orderData.sellerId, 'order-created', {
    order: newOrder
  });
  
  return newOrder;
};

// Mettre à jour le statut d'une commande
exports.updateOrderStatus = (orderId, userId, newStatus) => {
  const orders = readOrders();
  const index = orders.findIndex(o => o.id === orderId);
  
  if (index === -1) {
    const error = new Error('Commande introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  // Vérifier que l'utilisateur est soit le vendeur, soit l'acheteur, soit admin
  const order = orders[index];
  if (order.sellerId !== userId && order.buyerId !== userId) {
    const error = new Error('Non autorisé: Vous n\'êtes pas concerné par cette commande');
    error.statusCode = 403;
    throw error;
  }
  
  // Valider le statut
  const validStatuses = ['En attente', 'En cours', 'Livrée', 'Terminé', 'Annulée'];
  if (!validStatuses.includes(newStatus)) {
    const error = new Error('Statut invalide');
    error.statusCode = 400;
    throw error;
  }
  
  orders[index].status = newStatus;
  orders[index].updatedAt = new Date().toISOString();
  
  writeOrders(orders);
  
  console.log('✅ [Orders] Statut de commande mis à jour:', orderId, '→', newStatus);
  
  // Notifier l'acheteur et le vendeur du changement de statut
  webhookService.notifyUser(order.buyerId, 'order-updated', {
    order: orders[index]
  });
  webhookService.notifyUser(order.sellerId, 'order-updated', {
    order: orders[index]
  });
  
  return orders[index];
};

// Annuler une commande
exports.cancelOrder = (orderId, userId) => {
  return this.updateOrderStatus(orderId, userId, 'Annulée');
};

// Supprimer une commande (admin seulement)
exports.deleteOrder = (orderId) => {
  const orders = readOrders();
  const index = orders.findIndex(o => o.id === orderId);
  
  if (index === -1) {
    const error = new Error('Commande introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  const deletedOrder = orders.splice(index, 1)[0];
  writeOrders(orders);
  
  console.log('🗑️ [Orders] Commande supprimée:', orderId);
  
  return deletedOrder;
};

// Obtenir les statistiques des commandes pour un vendeur
exports.getSellerStats = (sellerId) => {
  const orders = readOrders().filter(o => o.sellerId === sellerId);
  
  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'En attente').length,
    inProgress: orders.filter(o => o.status === 'En cours').length,
    delivered: orders.filter(o => o.status === 'Livrée').length,
    completed: orders.filter(o => o.status === 'Terminé').length,
    cancelled: orders.filter(o => o.status === 'Annulée').length,
    totalRevenue: orders
      .filter(o => o.status !== 'Annulée')
      .reduce((sum, o) => sum + o.totalPrice, 0)
  };
};

// Obtenir les statistiques des commandes pour un acheteur
exports.getBuyerStats = (buyerId) => {
  const orders = readOrders().filter(o => o.buyerId === buyerId);
  
  return {
    total: orders.length,
    pending: orders.filter(o => o.status === 'En attente').length,
    inProgress: orders.filter(o => o.status === 'En cours').length,
    delivered: orders.filter(o => o.status === 'Livrée').length,
    completed: orders.filter(o => o.status === 'Terminé').length,
    cancelled: orders.filter(o => o.status === 'Annulée').length,
    totalSpent: orders
      .filter(o => o.status !== 'Annulée')
      .reduce((sum, o) => sum + o.totalPrice, 0)
  };
};
