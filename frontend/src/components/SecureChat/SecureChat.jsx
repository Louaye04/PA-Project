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
  getEncryptedMessages,
  getMySessions
} from '../../utils/dh-api';
import { onWebhookEvent, isWebhookConnected } from '../../utils/webhook-client';

const SecureChat = ({
  currentUser,
  otherUser,
  productId,
  token,
  onClose
}) => {
  const [sessionId, setSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState('initializing');
  const [keyExchangeProgress, setKeyExchangeProgress] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const [dhKeys, setDhKeys] = useState(null);
  const [sharedSecret, setSharedSecret] = useState(null);
  const [dhParams, setDhParams] = useState(null);
  const [webhookStatus, setWebhookStatus] = useState(() => (isWebhookConnected() ? 'connected' : 'disconnected'));
  const [webhookEventLabel, setWebhookEventLabel] = useState(() => (isWebhookConnected() ? 'Webhook connecté' : 'Webhook en attente'));
  const [webhookEventTimestamp, setWebhookEventTimestamp] = useState(null);

  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);
  const sessionIdRef = useRef(null);

  const updateWebhookIndicator = (status, label) => {
    setWebhookStatus(status);
    setWebhookEventLabel(label);
    setWebhookEventTimestamp(new Date());
  };

  const formatWebhookTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  useEffect(() => {
    initializeDHSession();

    const unsubscribeDHSessionActive = onWebhookEvent('dh-session-active', (data) => {
      console.log('📡 [SecureChat] Session DH active notifiée par webhook:', data.sessionId);
      if (data.sessionId === sessionIdRef.current) {
        updateWebhookIndicator('active', 'Session active détectée');
        handleDHSessionActive();
      }
    });

    const unsubscribeDHKeySubmitted = onWebhookEvent('dh-key-submitted', (data) => {
      console.log('📡 [SecureChat] Clé DH soumise par l\'autre partie:', data.role);
      if (data.sessionId === sessionIdRef.current) {
        updateWebhookIndicator('pending', 'Clé publique reçue');
        checkSessionStatus();
      }
    });

    const unsubscribeWebhookConnected = onWebhookEvent('connected', () => {
      updateWebhookIndicator('connected', 'Webhook connecté');
    });

    const unsubscribeWebhookError = onWebhookEvent('webhook-error', () => {
      updateWebhookIndicator('error', 'Erreur webhook');
    });

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
      unsubscribeDHSessionActive();
      unsubscribeDHKeySubmitted();
      unsubscribeWebhookConnected();
      unsubscribeWebhookError();
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const findExistingSession = async () => {
    if (!token) return null;
    try {
      const response = await getMySessions(token);
      const payload = response || {};
      const possibleSessions = payload.data || [];
      return possibleSessions.find(session => {
        if (!session || !session.productId) return false;
        const matchesProduct = session.productId.toString() === productId.toString();
        const matchesUser = session.otherPartyId && session.otherPartyId.toString() === otherUser.id.toString();
        return matchesProduct && matchesUser && session.status !== 'expired';
      }) || null;
    } catch (err) {
      console.error('📡 [SecureChat] Impossible de récupérer les sessions existantes:', err);
      return null;
    }
  };

  const initializeDHSession = async () => {
    try {
      setKeyExchangeProgress(10);

      const isSeller = currentUser.role === 'seller';
      const sellerId = isSeller ? currentUser.id : otherUser.id;
      const buyerId = isSeller ? otherUser.id : currentUser.id;

      console.log('🔐 [SecureChat] Création ou récupération d\'une session DH...');
      console.log('   Current User:', currentUser);
      console.log('   Other User:', otherUser);
      console.log('   Vendeur ID:', sellerId);
      console.log('   Acheteur ID:', buyerId);
      console.log('   Produit ID:', productId);

      const existingSession = await findExistingSession();
      let sessionData;
      if (existingSession) {
        console.log('🔁 [SecureChat] Session DH existante trouvée:', existingSession.sessionId);
        const sessionInfo = await getDHSession(existingSession.sessionId, token);
        sessionData = sessionInfo.data;
      } else {
        const sessionResponse = await createDHSession(sellerId, buyerId, productId, token);
        sessionData = sessionResponse.data;
      }

      const newSessionId = sessionData.sessionId;
      const params = sessionData.params;

      setSessionId(newSessionId);
      sessionIdRef.current = newSessionId;
      setDhParams(params);
      setKeyExchangeProgress(30);

      console.log('✅ [SecureChat] Session prête:', newSessionId);
      console.log('   Prime (n):', params.prime.substring(0, 40) + '...');
      console.log('   Generator (g):', params.generator);

      await generateAndSubmitKeys(newSessionId, params, isSeller);

    } catch (err) {
      console.error('❌ [SecureChat] Erreur initialisation:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Erreur inconnue';
      setError(`Impossible de créer le canal sécurisé: ${errorMsg}`);
      setSessionStatus('error');
    }
  };

  const generateAndSubmitKeys = async (sessionId, params, isSeller) => {
    try {
      setSessionStatus('key-exchange');
      setKeyExchangeProgress(40);

      console.log('🔑 [SecureChat] Génération de la paire de clés...');

      const keys = await generateDHKeyPair(params.prime, params.generator);
      setDhKeys(keys);
      setKeyExchangeProgress(60);

      console.log('✅ [SecureChat] Clés générées');
      console.log('   Clé privée (gardée secrète):', keys.privateKey.substring(0, 20) + '...');
      console.log('   Clé publique (sera envoyée):', keys.publicKey.substring(0, 20) + '...');

      let submitResponse;
      if (isSeller) {
        submitResponse = await submitSellerPublicKey(sessionId, keys.publicKey, token);
        console.log('📤 [SecureChat] Clé publique vendeur (X) envoyée');
      } else {
        submitResponse = await submitBuyerPublicKey(sessionId, keys.publicKey, token);
        console.log('📤 [SecureChat] Clé publique acheteur (Y) envoyée');
      }

      setKeyExchangeProgress(70);

      const otherPublicKey = isSeller
        ? submitResponse?.buyerPublicKey
        : submitResponse?.sellerPublicKey;

      if (otherPublicKey && submitResponse?.status === 'active') {
        console.log('✅ [SecureChat] Clé de l\'autre partie déjà disponible (connexion simultanée)!');
        await computeSecretImmediately(sessionId, keys, params, otherPublicKey);
      } else {
        await waitForOtherKeyAndComputeSecret(sessionId, keys, params);
      }

    } catch (err) {
      console.error('❌ [SecureChat] Erreur génération clés:', err);
      setError('Erreur lors de l\'échange de clés');
      setSessionStatus('error');
    }
  };

  const handleDHSessionActive = async () => {
    try {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId) return;

      console.log('🔔 [SecureChat] Webhook: Session active - chargement des clés...');

      const sessionData = await getDHSession(activeSessionId, token);
      const session = sessionData.data;

      if (session.status === 'active') {
        const otherPublicKey = session.userRole === 'seller'
          ? session.buyerPublicKey
          : session.sellerPublicKey;

        if (otherPublicKey && dhKeys && dhParams) {
          await computeSecretImmediately(activeSessionId, dhKeys, dhParams, otherPublicKey);
        }
      }
    } catch (err) {
      console.error('❌ [SecureChat] Erreur traitement webhook session active:', err);
    }
  };

  const checkSessionStatus = async () => {
    try {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId) return;

      const sessionData = await getDHSession(activeSessionId, token);
      const session = sessionData.data;

      if (session.status === 'active' && !sharedSecret) {
        const otherPublicKey = session.userRole === 'seller'
          ? session.buyerPublicKey
          : session.sellerPublicKey;

        if (otherPublicKey && dhKeys && dhParams) {
          await computeSecretImmediately(activeSessionId, dhKeys, dhParams, otherPublicKey);
        }
      }
    } catch (err) {
      console.error('❌ [SecureChat] Erreur vérification statut:', err);
    }
  };

  const computeSecretImmediately = async (sessionId, myKeys, params, otherPublicKey) => {
    try {
      setKeyExchangeProgress(80);

      console.log('🔐 [SecureChat] Calcul immédiat du secret partagé...');
      console.log('   Autre clé publique:', otherPublicKey.substring(0, 20) + '...');

      setKeyExchangeProgress(90);

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

      startMessagePolling(sessionId);

    } catch (err) {
      console.error('❌ [SecureChat] Erreur calcul secret partagé:', err);
      setError('Erreur lors du calcul de la clé partagée');
      setSessionStatus('error');
    }
  };

  const waitForOtherKeyAndComputeSecret = async (sessionId, myKeys, params) => {
    try {
      setKeyExchangeProgress(80);

      let attempts = 0;
      const maxAttempts = 120;

      setError(`En attente de ${currentUser.role === 'seller' ? "l'acheteur" : "le vendeur"}... L'autre partie doit ouvrir le chat sécurisé pour que l'échange de clés se termine.`);

      const checkInterval = setInterval(async () => {
        attempts++;

        try {
          const sessionData = await getDHSession(sessionId, token);
          const session = sessionData.data;

          console.log('🔄 [SecureChat] Vérification session (tentative ' + attempts + '/' + maxAttempts + ')');
          console.log('   Status:', session.status);

          if (session.status === 'active') {
            clearInterval(checkInterval);

            const otherPublicKey = session.userRole === 'seller'
              ? session.buyerPublicKey
              : session.sellerPublicKey;

            console.log('✅ [SecureChat] Clé de l\'autre partie reçue!');
            console.log('   Autre clé publique:', otherPublicKey.substring(0, 20) + '...');

            setKeyExchangeProgress(90);
            setError(null);

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

            startMessagePolling(sessionId);
          }
        } catch (err) {
          console.error('❌ [SecureChat] Erreur vérification session:', err);
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          setError(`Timeout: ${currentUser.role === 'seller' ? "L'acheteur" : "Le vendeur"} n'a pas rejoint le canal sécurisé dans les 2 minutes. Assurez-vous que l'autre partie ouvre également le chat sécurisé.`);
          setSessionStatus('error');
        }
      }, 1000);

    } catch (err) {
      console.error('❌ [SecureChat] Erreur calcul secret partagé:', err);
      setError('Erreur lors du calcul de la clé partagée');
      setSessionStatus('error');
    }
  };

  const startMessagePolling = (sessionId) => {
    fetchMessages(sessionId);
    pollInterval.current = setInterval(() => {
      fetchMessages(sessionId);
    }, 2000);
  };

  const fetchMessages = async (sessionId) => {
    try {
      const response = await getEncryptedMessages(sessionId, token);
      const encryptedMessages = response.data;

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

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !sharedSecret || sending) {
      return;
    }

    setSending(true);

    try {
      console.log('🔒 [SecureChat] Chiffrement du message...');
      console.log('   Message:', newMessage);

      const encrypted = await encryptMessage(newMessage, sharedSecret);

      console.log('✅ [SecureChat] Message chiffré');
      console.log('   Ciphertext:', encrypted.ciphertext.substring(0, 40) + '...');

      await sendEncryptedMessage(sessionId, encrypted, token);

      console.log('📤 [SecureChat] Message envoyé au serveur (chiffré)');

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        fromMe: true,
        text: newMessage,
        timestamp: new Date().toISOString()
      }]);

      setNewMessage('');

      setTimeout(() => fetchMessages(sessionId), 500);

    } catch (err) {
      console.error('❌ [SecureChat] Erreur envoi message:', err);
      setError('Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="secure-chat-overlay">
      <div className="secure-chat-container">
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
              <div className={`webhook-indicator webhook-${webhookStatus}`}>
                <span className="indicator-dot" />
                <span className="indicator-text">
                  {webhookEventLabel}
                  {webhookEventTimestamp && (
                    <span className="indicator-time">{formatWebhookTime(webhookEventTimestamp)}</span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

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

        {error && (
          <div className="error-panel">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

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
