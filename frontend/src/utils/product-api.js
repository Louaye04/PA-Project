import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Obtenir tous les produits
 */
export async function getAllProducts() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('❌ [Products API] Erreur récupération produits:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Obtenir les produits du vendeur connecté
 */
export async function getMyProducts() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.get(`${API_BASE_URL}/api/products/my-products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('❌ [Products API] Erreur récupération mes produits:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Créer un nouveau produit (vendeurs seulement)
 */
export async function createProduct(productData) {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.post(
      `${API_BASE_URL}/api/products`,
      productData,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Products API] Erreur création produit:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Mettre à jour un produit
 */
export async function updateProduct(productId, updates) {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.put(
      `${API_BASE_URL}/api/products/${productId}`,
      updates,
      {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Products API] Erreur mise à jour produit:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Supprimer un produit
 */
export async function deleteProduct(productId) {
  try {
    const token = localStorage.getItem('authToken');
    const response = await axios.delete(
      `${API_BASE_URL}/api/products/${productId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('❌ [Products API] Erreur suppression produit:', error.response?.data || error.message);
    throw error;
  }
}
