const fs = require('fs');
const path = require('path');
const webhookService = require('./webhook.service');
const productService = require('./product.service');

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
  return orders.filter(o => String(o.buyerId) === String(buyerId));
};

// Obtenir les commandes d'un vendeur
exports.getOrdersBySeller = (sellerId) => {
  const orders = readOrders();
  return orders.filter(o => String(o.sellerId) === String(sellerId));
};

// Obtenir une commande par ID
exports.getOrderById = (orderId) => {
  const orders = readOrders();
  return orders.find(o => String(o.id) === String(orderId));
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
    status: 'pending', // standard keys: pending, awaiting_payment, paid, in_progress, shipped, delivered, cancelled
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
  const index = orders.findIndex(o => String(o.id) === String(orderId));
  
  if (index === -1) {
    const error = new Error('Commande introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  // Vérifier que l'utilisateur est soit le vendeur, soit l'acheteur, soit admin
  const order = orders[index];
  if (String(order.sellerId) !== String(userId) && String(order.buyerId) !== String(userId)) {
    // Pour réduire la surface d'énumération, retourner une 404 plutôt qu'une 403
    // (l'attaquant ne doit pas pouvoir distinguer "n'existe pas" vs "existe mais non autorisé").
    const error = new Error('Commande introuvable');
    error.statusCode = 404;
    throw error;
  }
  
  // Valider le statut (accept known internal status keys)
  const validStatuses = ['pending', 'accepted', 'awaiting_payment', 'paid', 'in_progress', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    const error = new Error('Statut invalide');
    error.statusCode = 400;
    throw error;
  }
  const prevStatus = orders[index].status;

  // If cancelling and it wasn't already cancelled, restore product stock
  if (newStatus === 'cancelled' && prevStatus !== 'cancelled') {
    try {
      productService.incrementStock(orders[index].productId, orders[index].quantity || 1);
    } catch (err) {
      // Log but allow status change to proceed — surface a clear error if needed
      console.error('Failed to restore stock for product', orders[index].productId, err.message);
    }
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
  // Use normalized internal status key 'cancelled' and call the exported updater
  return exports.updateOrderStatus(orderId, userId, 'cancelled');
};

// Supprimer une commande (admin seulement)
exports.deleteOrder = (orderId) => {
  const orders = readOrders();
  const index = orders.findIndex(o => String(o.id) === String(orderId));
  
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
  // Normaliser sellerId en string avant comparaison
  const sid = String(sellerId);
  const allOrders = readOrders();
  const orders = allOrders.filter(o => String(o.sellerId) === sid);
  // Helper: normalize status strings (handle localized/capitalized variants)
  const normalizeStatus = (s) => {
    if (!s) return '';
    const st = String(s).toLowerCase().trim();
    if (st.includes('paid') || st === 'payée' || st === 'payee') return 'paid';
    if (st.includes('deliv') || st.includes('livr')) return 'delivered';
    if (st.includes('in_progress') || st.includes('in progress') || st.includes('en cours')) return 'in_progress';
    if (st.includes('await') || st.includes('en attente') || st.includes('awaiting')) return 'awaiting_payment';
    if (st.includes('cancel') || st.includes('annul')) return 'cancelled';
    if (st === 'accepted' || st === 'acceptée' || st === 'acceptee') return 'accepted';
    if (st === 'pending' || st === 'en attente') return 'pending';
    return st;
  };

  // Définir les statuts comptant comme revenus (inclut in_progress si le flux métier l'utilise)
  const revenueStatuses = ['paid', 'delivered', 'in_progress'];

  const normalized = orders.map(o => ({ ...o, _status: normalizeStatus(o.status) }));

  return {
    total: normalized.length,
    pending: normalized.filter(o => o._status === 'pending').length,
    accepted: normalized.filter(o => o._status === 'accepted').length,
    inProgress: normalized.filter(o => o._status === 'in_progress').length,
    delivered: normalized.filter(o => o._status === 'delivered').length,
    completed: normalized.filter(o => o._status === 'paid').length,
    cancelled: normalized.filter(o => o._status === 'cancelled').length,
    totalRevenue: normalized
      .filter(o => revenueStatuses.includes(o._status))
      .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)
  };
};

// Obtenir les statistiques des commandes pour un acheteur
exports.getBuyerStats = (buyerId) => {
  const bid = String(buyerId);
  const allOrders = readOrders();
  const orders = allOrders.filter(o => String(o.buyerId) === bid);
  // reuse normalization logic
  const normalizeStatus = (s) => {
    if (!s) return '';
    const st = String(s).toLowerCase().trim();
    if (st.includes('paid') || st === 'payée' || st === 'payee') return 'paid';
    if (st.includes('deliv') || st.includes('livr')) return 'delivered';
    if (st.includes('in_progress') || st.includes('in progress') || st.includes('en cours')) return 'in_progress';
    if (st.includes('await') || st.includes('en attente') || st.includes('awaiting')) return 'awaiting_payment';
    if (st.includes('cancel') || st.includes('annul')) return 'cancelled';
    if (st === 'accepted' || st === 'acceptée' || st === 'acceptee') return 'accepted';
    if (st === 'pending' || st === 'en attente') return 'pending';
    return st;
  };

  const revenueStatuses = ['paid', 'delivered', 'in_progress'];
  const normalized = orders.map(o => ({ ...o, _status: normalizeStatus(o.status) }));

  return {
    total: normalized.length,
    pending: normalized.filter(o => o._status === 'pending').length,
    accepted: normalized.filter(o => o._status === 'accepted').length,
    inProgress: normalized.filter(o => o._status === 'in_progress').length,
    delivered: normalized.filter(o => o._status === 'delivered').length,
    completed: normalized.filter(o => o._status === 'paid').length,
    cancelled: normalized.filter(o => o._status === 'cancelled').length,
    totalSpent: normalized
      .filter(o => revenueStatuses.includes(o._status))
      .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0)
  };
};
