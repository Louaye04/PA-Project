import axios from 'axios';
import API_BASE_URL from "../config/api";

/**
 * Obtenir les commandes de l'utilisateur connecté
 */
export async function getMyOrders() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/orders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('❌ [Orders API] Erreur récupération commandes:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Obtenir les statistiques
 */
export async function getMyStats() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/orders/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.data || {};
  } catch (error) {
    console.error('❌ [Orders API] Erreur récupération stats:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Créer une nouvelle commande (acheteurs seulement)
 */
export async function createOrder(orderData) {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(
      `${API_BASE_URL}/api/orders`,
      orderData,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Orders API] Erreur création commande:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Mettre à jour le statut d'une commande
 */
export async function updateOrderStatus(orderId, status) {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.put(
      `${API_BASE_URL}/api/orders/${orderId}/status`,
      { status },
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Orders API] Erreur mise à jour statut:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Annuler une commande
 */
export async function cancelOrder(orderId) {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(
      `${API_BASE_URL}/api/orders/${orderId}/cancel`,
      {},
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Orders API] Erreur annulation commande:', error.response?.data || error.message);
    throw error;
  }
}
