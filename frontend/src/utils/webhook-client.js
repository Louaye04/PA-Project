/**
 * Webhook Client - Server-Sent Events (SSE)
 * Permet de recevoir des notifications en temps réel du serveur
 */

import API_BASE_URL from "../config/api";

let eventSource = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000; // 3 secondes

// Callbacks pour les différents types d'événements
const eventHandlers = {
  connected: [],
  'product-created': [],
  'product-updated': [],
  'product-deleted': [],
  'order-created': [],
  'order-updated': [],
  'dh-session-created': [],
  'dh-session-active': [],
  'dh-key-submitted': [],
  'webhook-error': []
};

/**
 * Se connecter au flux SSE
 */
export const connectWebhook = () => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.warn('📡 [Webhook] Pas de token - connexion annulée');
    return null;
  }
  
  // Fermer la connexion existante
  if (eventSource) {
    eventSource.close();
  }
  
  // Créer une nouvelle connexion SSE
  const url = `${API_BASE_URL.replace(/\/$/, '')}/api/webhook/events?token=${encodeURIComponent(token)}`;
  eventSource = new EventSource(url);
  
  // Événement de connexion
  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    console.log('📡 [Webhook] Connecté:', data.message);
    reconnectAttempts = 0; // Reset le compteur
    triggerHandlers('connected', data);
  });
  
  // Événement de session active
  eventSource.addEventListener('dh-session-active', (event) => {
    const data = JSON.parse(event.data);
    console.log('📡 [Webhook] Session DH active:', data.data);
    triggerHandlers('dh-session-active', data.data);
  });
  
  // Événement de clé soumise
  eventSource.addEventListener('dh-key-submitted', (event) => {
    const data = JSON.parse(event.data);
    console.log('📡 [Webhook] Clé DH soumise:', data.data);
    triggerHandlers('dh-key-submitted', data.data);
  });
  
  // Événement de produit créé
  eventSource.addEventListener('product-created', (event) => {
    const data = JSON.parse(event.data);
    console.log('📡 [Webhook] Produit créé:', data.data.product.name);
    triggerHandlers('product-created', data.data);
  });
  
  // Événement de produit mis à jour
  eventSource.addEventListener('product-updated', (event) => {
    const data = JSON.parse(event.data);
    console.log('📡 [Webhook] Produit mis à jour:', data.data.product.name);
    triggerHandlers('product-updated', data.data);
  });
  
  // Événement de produit supprimé
  eventSource.addEventListener('product-deleted', (event) => {
    const data = JSON.parse(event.data);
    console.log('📡 [Webhook] Produit supprimé:', data.data.productId);
    triggerHandlers('product-deleted', data.data);
  });
  
  // Événement de commande créée
  eventSource.addEventListener('order-created', (event) => {
    const data = JSON.parse(event.data);
    console.log('📡 [Webhook] Commande créée:', data.data.order.id);
    triggerHandlers('order-created', data.data);
  });
  
  // Événement de commande mise à jour
  eventSource.addEventListener('order-updated', (event) => {
    const data = JSON.parse(event.data);
    console.log('📡 [Webhook] Commande mise à jour:', data.data.order.id);
    triggerHandlers('order-updated', data.data);
  });
  
  // Événement de session DH créée
  eventSource.addEventListener('dh-session-created', (event) => {
    const data = JSON.parse(event.data);
    console.log('📡 [Webhook] Session DH créée:', data.data.sessionId);
    triggerHandlers('dh-session-created', data.data);
  });
  
  // Gestion des erreurs
  eventSource.onerror = (error) => {
    console.error('📡 [Webhook] Erreur de connexion:', error);
    triggerHandlers('webhook-error', { error });
    
    eventSource.close();
    
    // Tentative de reconnexion
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(`📡 [Webhook] Reconnexion dans ${RECONNECT_DELAY}ms (tentative ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(() => {
        connectWebhook();
      }, RECONNECT_DELAY);
    } else {
      console.error('📡 [Webhook] Nombre maximum de tentatives de reconnexion atteint');
    }
  };
  
  return eventSource;
};

/**
 * Se déconnecter du flux SSE
 */
export const disconnectWebhook = () => {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
    console.log('📡 [Webhook] Déconnecté');
  }
};

/**
 * S'abonner à un type d'événement
 */
export const onWebhookEvent = (eventType, callback) => {
  if (!eventHandlers[eventType]) {
    console.warn(`📡 [Webhook] Type d'événement inconnu: ${eventType}`);
    return () => {};
  }
  
  eventHandlers[eventType].push(callback);
  
  // Retourner une fonction de désabonnement
  return () => {
    const index = eventHandlers[eventType].indexOf(callback);
    if (index > -1) {
      eventHandlers[eventType].splice(index, 1);
    }
  };
};

/**
 * Déclencher tous les handlers pour un type d'événement
 */
const triggerHandlers = (eventType, data) => {
  if (eventHandlers[eventType]) {
    eventHandlers[eventType].forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`📡 [Webhook] Erreur dans le handler ${eventType}:`, err);
      }
    });
  }
};

/**
 * Vérifier si le webhook est connecté
 */
export const isWebhookConnected = () => {
  return eventSource !== null && eventSource.readyState === EventSource.OPEN;
};

export default {
  connect: connectWebhook,
  disconnect: disconnectWebhook,
  on: onWebhookEvent,
  isConnected: isWebhookConnected
};
