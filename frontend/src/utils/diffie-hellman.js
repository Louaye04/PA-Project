/* global BigInt */
/**
 * Diffie-Hellman Client-side Cryptography Utilities
 * 
 * Gère les opérations cryptographiques côté client pour:
 * - Génération de clés DH (privée x, publique X = g^x mod n)
 * - Calcul de la clé partagée K = Y^x mod n
 * - Chiffrement/déchiffrement AES-256-GCM avec la clé K
 */

/**
 * Convertir un buffer en chaîne hexadécimale
 */
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convertir une chaîne hexadécimale en buffer
 */
function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Générer une paire de clés Diffie-Hellman
 * @param {string} primeHex - Le nombre premier n (en hexadécimal)
 * @param {string} generatorHex - Le générateur g (en hexadécimal)
 * @returns {Promise<{privateKey: string, publicKey: string}>}
 */
export async function generateDHKeyPair(primeHex, generatorHex) {
  try {
    // Convertir les paramètres hex en BigInt
    const prime = BigInt('0x' + primeHex);
    const generator = BigInt('0x' + generatorHex);
    
    // Générer une clé privée aléatoire x (256 bits)
    const privateKeyBytes = new Uint8Array(32);
    window.crypto.getRandomValues(privateKeyBytes);
    const privateKey = BigInt('0x' + bufferToHex(privateKeyBytes));
    
    // Calculer la clé publique: X = g^x mod n
    const publicKey = modularExponentiation(generator, privateKey, prime);
    
    console.log('🔑 [DH Client] Clés générées');
    console.log('   Clé privée x (gardée secrète):', privateKey.toString(16).substring(0, 20) + '...');
    console.log('   Clé publique X (sera envoyée):', publicKey.toString(16).substring(0, 20) + '...');
    
    return {
      privateKey: privateKey.toString(16),
      publicKey: publicKey.toString(16)
    };
  } catch (error) {
    console.error('❌ [DH Client] Erreur génération clés:', error);
    throw error;
  }
}

/**
 * Calculer la clé partagée à partir de la clé publique de l'autre partie
 * @param {string} otherPublicKeyHex - La clé publique de l'autre (Y ou X en hex)
 * @param {string} myPrivateKeyHex - Ma clé privée (x ou y en hex)
 * @param {string} primeHex - Le nombre premier n (en hexadécimal)
 * @returns {Promise<string>} La clé partagée K en hexadécimal
 */
export async function computeSharedSecret(otherPublicKeyHex, myPrivateKeyHex, primeHex) {
  try {
    const otherPublicKey = BigInt('0x' + otherPublicKeyHex);
    const myPrivateKey = BigInt('0x' + myPrivateKeyHex);
    const prime = BigInt('0x' + primeHex);
    
    // Calculer K = Y^x mod n (ou X^y mod n)
    const sharedSecret = modularExponentiation(otherPublicKey, myPrivateKey, prime);
    
    console.log('🔐 [DH Client] Clé partagée calculée');
    console.log('   K (secret partagé):', sharedSecret.toString(16).substring(0, 20) + '...');
    console.log('   ⚠️ Cette clé ne sera JAMAIS transmise sur le réseau!');
    
    return sharedSecret.toString(16);
  } catch (error) {
    console.error('❌ [DH Client] Erreur calcul clé partagée:', error);
    throw error;
  }
}

/**
 * Exponentiation modulaire: (base^exponent) mod modulus
 * Utilise l'algorithme "square and multiply" pour l'efficacité
 */
function modularExponentiation(base, exponent, modulus) {
  if (modulus === 1n) return 0n;
  
  let result = 1n;
  base = base % modulus;
  
  while (exponent > 0n) {
    if (exponent % 2n === 1n) {
      result = (result * base) % modulus;
    }
    exponent = exponent / 2n;
    base = (base * base) % modulus;
  }
  
  return result;
}

/**
 * Dériver une clé AES-256 à partir de la clé partagée DH
 * @param {string} sharedSecretHex - La clé partagée K en hexadécimal
 * @returns {Promise<CryptoKey>} Clé AES-256 pour chiffrement/déchiffrement
 */
async function deriveAESKey(sharedSecretHex) {
  try {
    // Convertir le secret partagé en bytes
    const sharedSecretBytes = hexToBuffer(sharedSecretHex);
    
    // Hash SHA-256 pour obtenir 256 bits
    const keyMaterial = await window.crypto.subtle.digest('SHA-256', sharedSecretBytes);
    
    // Importer comme clé AES-GCM
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
    
    return aesKey;
  } catch (error) {
    console.error('❌ [DH Client] Erreur dérivation clé AES:', error);
    throw error;
  }
}

/**
 * Chiffrer un message avec la clé partagée
 * @param {string} plaintext - Le message en clair
 * @param {string} sharedSecretHex - La clé partagée K en hexadécimal
 * @returns {Promise<{ciphertext: string, iv: string, authTag: string}>}
 */
export async function encryptMessage(plaintext, sharedSecretHex) {
  try {
    // Dériver la clé AES
    const aesKey = await deriveAESKey(sharedSecretHex);
    
    // Générer un IV aléatoire (12 bytes pour GCM)
    const iv = new Uint8Array(12);
    window.crypto.getRandomValues(iv);
    
    // Encoder le message
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(plaintext);
    
    // Chiffrer avec AES-256-GCM
    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128 // 128-bit auth tag
      },
      aesKey,
      messageBytes
    );
    
    // GCM produit ciphertext + authTag ensemble
    const encryptedBytes = new Uint8Array(encryptedData);
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);
    const authTag = encryptedBytes.slice(encryptedBytes.length - 16);
    
    const result = {
      ciphertext: bufferToHex(ciphertext),
      iv: bufferToHex(iv),
      authTag: bufferToHex(authTag)
    };
    
    console.log('🔒 [DH Client] Message chiffré');
    console.log('   Message original:', plaintext.substring(0, 30) + '...');
    console.log('   Ciphertext:', result.ciphertext.substring(0, 40) + '...');
    console.log('   IV:', result.iv);
    console.log('   Auth Tag:', result.authTag.substring(0, 20) + '...');
    
    return result;
  } catch (error) {
    console.error('❌ [DH Client] Erreur chiffrement:', error);
    throw error;
  }
}

/**
 * Déchiffrer un message avec la clé partagée
 * @param {string} ciphertextHex - Le ciphertext en hexadécimal
 * @param {string} ivHex - L'IV en hexadécimal
 * @param {string} authTagHex - L'auth tag en hexadécimal
 * @param {string} sharedSecretHex - La clé partagée K en hexadécimal
 * @returns {Promise<string>} Le message en clair
 */
export async function decryptMessage(ciphertextHex, ivHex, authTagHex, sharedSecretHex) {
  try {
    // Dériver la clé AES
    const aesKey = await deriveAESKey(sharedSecretHex);
    
    // Convertir les données
    const ciphertext = hexToBuffer(ciphertextHex);
    const iv = hexToBuffer(ivHex);
    const authTag = hexToBuffer(authTagHex);
    
    // Combiner ciphertext + authTag pour GCM
    const combined = new Uint8Array(ciphertext.length + authTag.length);
    combined.set(ciphertext);
    combined.set(authTag, ciphertext.length);
    
    // Déchiffrer avec AES-256-GCM
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      aesKey,
      combined
    );
    
    // Décoder le message
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decryptedData);
    
    console.log('🔓 [DH Client] Message déchiffré');
    console.log('   Ciphertext reçu:', ciphertextHex.substring(0, 40) + '...');
    console.log('   Message déchiffré:', plaintext.substring(0, 30) + '...');
    
    return plaintext;
  } catch (error) {
    console.error('❌ [DH Client] Erreur déchiffrement:', error);
    throw new Error('Impossible de déchiffrer le message. Clé incorrecte ou données corrompues.');
  }
}

/**
 * Générer un identifiant de device pour le fingerprinting
 */
export function generateDeviceFingerprint() {
  const data = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: Date.now()
  };
  
  return JSON.stringify(data);
}

/**
 * Tester les fonctionnalités crypto du navigateur
 */
export async function testCryptoSupport() {
  const tests = {
    cryptoAPI: !!window.crypto && !!window.crypto.subtle,
    randomValues: !!window.crypto.getRandomValues,
    aesGCM: false,
    bigInt: typeof BigInt !== 'undefined'
  };
  
  try {
    // Test AES-GCM
    const testKey = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    tests.aesGCM = !!testKey;
  } catch (e) {
    tests.aesGCM = false;
  }
  
  const allSupported = Object.values(tests).every(v => v === true);
  
  console.log('🧪 [DH Client] Test support crypto:', tests);
  console.log(allSupported ? '✅ Tous les tests passés' : '❌ Certains tests échoués');
  
  return { tests, supported: allSupported };
}
