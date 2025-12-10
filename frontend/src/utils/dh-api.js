import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Créer une nouvelle session Diffie-Hellman
 * @param {string} sellerId - ID du vendeur
 * @param {string} buyerId - ID de l'acheteur
 * @param {string} productId - ID du produit (optionnel)
 * @param {string} token - JWT token
 * @returns {Promise<Object>} Session info avec params DH
 */
export async function createDHSession(sellerId, buyerId, productId, token) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/dh/create-session`,
      { sellerId, buyerId, productId },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [DH API] Erreur création session:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Soumettre la clé publique du vendeur
 * @param {string} sessionId - ID de la session DH
 * @param {string} publicKey - Clé publique X (en hex)
 * @param {string} token - JWT token
 */
export async function submitSellerPublicKey(sessionId, publicKey, token) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/dh/submit-seller-key`,
      { sessionId, publicKey },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [DH API] Erreur soumission clé vendeur:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Soumettre la clé publique de l'acheteur
 * @param {string} sessionId - ID de la session DH
 * @param {string} publicKey - Clé publique Y (en hex)
 * @param {string} token - JWT token
 */
export async function submitBuyerPublicKey(sessionId, publicKey, token) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/dh/submit-buyer-key`,
      { sessionId, publicKey },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [DH API] Erreur soumission clé acheteur:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Récupérer les informations d'une session
 * @param {string} sessionId - ID de la session DH
 * @param {string} token - JWT token
 */
export async function getDHSession(sessionId, token) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/dh/session/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [DH API] Erreur récupération session:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Envoyer un message chiffré
 * @param {string} sessionId - ID de la session DH
 * @param {Object} encryptedData - {ciphertext, iv, authTag}
 * @param {string} token - JWT token
 */
export async function sendEncryptedMessage(sessionId, encryptedData, token) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/dh/send-message`,
      { sessionId, encryptedData },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [DH API] Erreur envoi message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Récupérer les messages chiffrés d'une session
 * @param {string} sessionId - ID de la session DH
 * @param {string} token - JWT token
 */
export async function getEncryptedMessages(sessionId, token) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/dh/messages/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [DH API] Erreur récupération messages:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Récupérer toutes les sessions DH de l'utilisateur
 * @param {string} token - JWT token
 */
export async function getMySessions(token) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/dh/my-sessions`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('❌ [DH API] Erreur récupération sessions:', error.response?.data || error.message);
    throw error;
  }
}
