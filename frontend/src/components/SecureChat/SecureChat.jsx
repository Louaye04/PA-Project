import React, { useState, useEffect, useRef } from 'react';
import './SecureChat.scss';
import {
  generateDHKeyPair,
  computeSharedSecret,
  encryptMessage,
  decryptMessage
} from '../../utils/diffie-hellman';
import {
  createDHSession,
  submitSellerPublicKey,
  submitBuyerPublicKey,
  getDHSession,
  sendEncryptedMessage,
  getEncryptedMessages
} from '../../utils/dh-api';

const SecureChat = ({ 
  currentUser, 
  otherUser, 
  productId, 
  token,
  onClose 
}) => {
  const [sessionId, setSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('initializing'); // initializing, key-exchange, active, error
  const [keyExchangeProgress, setKeyExchangeProgress] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  
  // Clés cryptographiques (stockées en mémoire uniquement)
  const [dhKeys, setDhKeys] = useState(null); // { privateKey, publicKey }
  const [sharedSecret, setSharedSecret] = useState(null);
  const [dhParams, setDhParams] = useState(null); // { prime, generator }
  
  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  // Initialiser la session DH au montage du composant
  useEffect(() => {
    initializeDHSession();
    
    return () => {
      // Nettoyer le polling au démontage
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, []);

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Étape 1: Initialiser la session DH
   */
  const initializeDHSession = async () => {
    try {
      setKeyExchangeProgress(10);
      
      // Déterminer qui est vendeur et qui est acheteur
      const isSeller = currentUser.role === 'seller';
      const sellerId = isSeller ? currentUser.id : otherUser.id;
      const buyerId = isSeller ? otherUser.id : currentUser.id;
      
      console.log('🔐 [SecureChat] Création session DH...');
      console.log('   Vendeur:', sellerId);
      console.log('   Acheteur:', buyerId);
      console.log('   Produit:', productId);
      
      // Créer la session sur le serveur
      const sessionResponse = await createDHSession(sellerId, buyerId, productId, token);
      const newSessionId = sessionResponse.data.sessionId;
      const params = sessionResponse.data.params;
      
      setSessionId(newSessionId);
      setDhParams(params);
      setKeyExchangeProgress(30);
      
      console.log('✅ [SecureChat] Session créée:', newSessionId);
      console.log('   Prime (n):', params.prime.substring(0, 40) + '...');
      console.log('   Generator (g):', params.generator);
      
      // Étape 2: Générer nos clés
      await generateAndSubmitKeys(newSessionId, params, isSeller);
      
    } catch (err) {
      console.error('❌ [SecureChat] Erreur initialisation:', err);
      setError('Impossible de créer le canal sécurisé');
      setSessionStatus('error');
    }
  };

  /**
   * Étape 2: Générer et soumettre nos clés
   */
  const generateAndSubmitKeys = async (sessionId, params, isSeller) => {
    try {
      setSessionStatus('key-exchange');
      setKeyExchangeProgress(40);
      
      console.log('🔑 [SecureChat] Génération de la paire de clés...');
      
      // Générer notre paire de clés (x, X) ou (y, Y)
      const keys = await generateDHKeyPair(params.prime, params.generator);
      setDhKeys(keys);
      setKeyExchangeProgress(60);
      
      console.log('✅ [SecureChat] Clés générées');
      console.log('   Clé privée (gardée secrète):', keys.privateKey.substring(0, 20) + '...');
      console.log('   Clé publique (sera envoyée):', keys.publicKey.substring(0, 20) + '...');
      
      // Soumettre notre clé publique au serveur
      if (isSeller) {
        await submitSellerPublicKey(sessionId, keys.publicKey, token);
        console.log('📤 [SecureChat] Clé publique vendeur (X) envoyée');
      } else {
        await submitBuyerPublicKey(sessionId, keys.publicKey, token);
        console.log('📤 [SecureChat] Clé publique acheteur (Y) envoyée');
      }
      
      setKeyExchangeProgress(70);
      
      // Étape 3: Attendre la clé de l'autre partie et calculer le secret partagé
      await waitForOtherKeyAndComputeSecret(sessionId, keys, params);
      
    } catch (err) {
      console.error('❌ [SecureChat] Erreur génération clés:', err);
      setError('Erreur lors de l\'échange de clés');
      setSessionStatus('error');
    }
  };

  /**
   * Étape 3: Attendre la clé de l'autre partie et calculer K
   */
  const waitForOtherKeyAndComputeSecret = async (sessionId, myKeys, params) => {
    try {
      setKeyExchangeProgress(80);
      
      // Polling pour attendre que l'autre partie soumette sa clé
      let attempts = 0;
      const maxAttempts = 60; // 60 tentatives = 1 minute
      
      const checkInterval = setInterval(async () => {
        attempts++;
        
        try {
          const sessionData = await getDHSession(sessionId, token);
          const session = sessionData.data;
          
          console.log('🔄 [SecureChat] Vérification session (tentative ' + attempts + ')');
          console.log('   Status:', session.status);
          
          if (session.status === 'active') {
            clearInterval(checkInterval);
            
            // Récupérer la clé publique de l'autre partie
            const otherPublicKey = session.userRole === 'seller' 
              ? session.buyerPublicKey 
              : session.sellerPublicKey;
            
            console.log('✅ [SecureChat] Clé de l\'autre partie reçue!');
            console.log('   Autre clé publique:', otherPublicKey.substring(0, 20) + '...');
            
            setKeyExchangeProgress(90);
            
            // Calculer la clé partagée K = other^myPrivate mod prime
            const secret = await computeSharedSecret(
              otherPublicKey,
              myKeys.privateKey,
              params.prime
            );
            
            setSharedSecret(secret);
            setKeyExchangeProgress(100);
            setSessionStatus('active');
            
            console.log('🎉 [SecureChat] Canal sécurisé établi!');
            console.log('   Secret partagé K calculé (JAMAIS transmis sur le réseau)');
            console.log('   Les messages seront chiffrés avec AES-256-GCM');
            
            // Commencer à récupérer les messages
            startMessagePolling(sessionId);
          }
        } catch (err) {
          console.error('❌ [SecureChat] Erreur vérification session:', err);
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          setError('Timeout: L\'autre partie n\'a pas rejoint le canal sécurisé');
          setSessionStatus('error');
        }
      }, 1000); // Vérifier toutes les secondes
      
    } catch (err) {
      console.error('❌ [SecureChat] Erreur calcul secret partagé:', err);
      setError('Erreur lors du calcul de la clé partagée');
      setSessionStatus('error');
    }
  };

  /**
   * Polling pour récupérer les nouveaux messages
   */
  const startMessagePolling = (sessionId) => {
    // Récupérer immédiatement
    fetchMessages(sessionId);
    
    // Puis toutes les 2 secondes
    pollInterval.current = setInterval(() => {
      fetchMessages(sessionId);
    }, 2000);
  };

  /**
   * Récupérer et déchiffrer les messages
   */
  const fetchMessages = async (sessionId) => {
    try {
      const response = await getEncryptedMessages(sessionId, token);
      const encryptedMessages = response.data;
      
      // Déchiffrer chaque message
      const decryptedMessages = await Promise.all(
        encryptedMessages.map(async (msg) => {
          try {
            const plaintext = await decryptMessage(
              msg.encryptedContent,
              msg.iv,
              msg.authTag,
              sharedSecret
            );
            
            return {
              id: msg.id,
              fromMe: msg.fromUserId === currentUser.id,
              text: plaintext,
              timestamp: msg.timestamp
            };
          } catch (err) {
            console.error('❌ [SecureChat] Erreur déchiffrement message:', err);
            return {
              id: msg.id,
              fromMe: msg.fromUserId === currentUser.id,
              text: '[Erreur de déchiffrement]',
              timestamp: msg.timestamp,
              error: true
            };
          }
        })
      );
      
      setMessages(decryptedMessages);
      
    } catch (err) {
      console.error('❌ [SecureChat] Erreur récupération messages:', err);
    }
  };

  /**
   * Envoyer un message chiffré
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !sharedSecret || sending) {
      return;
    }
    
    setSending(true);
    
    try {
      console.log('🔒 [SecureChat] Chiffrement du message...');
      console.log('   Message:', newMessage);
      
      // Chiffrer le message avec la clé partagée
      const encrypted = await encryptMessage(newMessage, sharedSecret);
      
      console.log('✅ [SecureChat] Message chiffré');
      console.log('   Ciphertext:', encrypted.ciphertext.substring(0, 40) + '...');
      
      // Envoyer au serveur
      await sendEncryptedMessage(sessionId, encrypted, token);
      
      console.log('📤 [SecureChat] Message envoyé au serveur (chiffré)');
      
      // Ajouter immédiatement à l'interface (optimistic update)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromMe: true,
        text: newMessage,
        timestamp: new Date().toISOString()
      }]);
      
      setNewMessage('');
      
      // Récupérer les messages pour avoir la version serveur
      setTimeout(() => fetchMessages(sessionId), 500);
      
    } catch (err) {
      console.error('❌ [SecureChat] Erreur envoi message:', err);
      setError('Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  /**
   * Formater l'heure
   */
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="secure-chat-overlay">
      <div className="secure-chat-container">
        {/* Header */}
        <div className="chat-header">
          <div className="header-left">
            <div className="lock-icon">🔐</div>
            <div className="header-info">
              <h3>Canal Sécurisé</h3>
              <p className="other-user">
                {otherUser.name || otherUser.email}
                {sessionStatus === 'active' && (
                  <span className="status-badge active">🟢 Chiffré E2E</span>
                )}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Key Exchange Progress */}
        {sessionStatus !== 'active' && sessionStatus !== 'error' && (
          <div className="key-exchange-panel">
            <h4>🔑 Échange de clés Diffie-Hellman</h4>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${keyExchangeProgress}%` }}
              ></div>
            </div>
            <p className="progress-text">
              {keyExchangeProgress < 30 && 'Création de la session...'}
              {keyExchangeProgress >= 30 && keyExchangeProgress < 60 && 'Génération des clés...'}
              {keyExchangeProgress >= 60 && keyExchangeProgress < 80 && 'Envoi de la clé publique...'}
              {keyExchangeProgress >= 80 && keyExchangeProgress < 100 && 'Attente de l\'autre partie...'}
              {keyExchangeProgress === 100 && '✅ Canal sécurisé établi!'}
            </p>
            <div className="security-info">
              <p>🔐 Vos messages seront chiffrés de bout en bout</p>
              <p>🚫 La plateforme ne peut pas lire vos messages</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-panel">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Messages */}
        {sessionStatus === 'active' && (
          <>
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>🔐 Canal sécurisé établi</p>
                  <p className="small">Envoyez votre premier message chiffré</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`message ${msg.fromMe ? 'message-sent' : 'message-received'} ${msg.error ? 'message-error' : ''}`}
                  >
                    <div className="message-content">
                      <p className="message-text">{msg.text}</p>
                      <span className="message-time">
                        {formatTime(msg.timestamp)}
                        {msg.fromMe && ' 🔐'}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="message-input-form" onSubmit={handleSendMessage}>
              <input
                type="text"
                className="message-input"
                placeholder="Écrivez un message chiffré..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={sending}
              />
              <button 
                type="submit" 
                className="send-btn"
                disabled={!newMessage.trim() || sending}
              >
                {sending ? '⏳' : '📤'}
              </button>
            </form>

            <div className="encryption-badge">
              <span className="badge-icon">🔒</span>
              <span className="badge-text">Chiffré AES-256-GCM</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SecureChat;
