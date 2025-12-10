<<<<<<< HEAD
const fs = require('fs');
const path = require('path');
const webhookService = require('./webhook.service');
=======
const fs = require("fs");
const path = require("path");
>>>>>>> 759a47eb324414a1b039db0442e8cb1cc0f42c2e

const PRODUCTS_FILE = path.join(__dirname, "../data/products.json");

// Helper: Lire les produits
const readProducts = () => {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading products:", error);
    return [];
  }
};

// Helper: Écrire les produits
const writeProducts = (products) => {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing products:", error);
    return false;
  }
};

// Obtenir tous les produits
exports.getAllProducts = () => {
  return readProducts();
};

// Obtenir les produits d'un vendeur
exports.getProductsBySeller = (sellerId) => {
  const products = readProducts();
  return products.filter((p) => p.sellerId === sellerId);
};

// Obtenir un produit par ID
exports.getProductById = (productId) => {
  const products = readProducts();
  return products.find((p) => p.id === productId);
};

// Créer un nouveau produit
exports.createProduct = (productData) => {
  const products = readProducts();

  const newProduct = {
    id: Date.now().toString(), // Simple ID based on timestamp
    name: productData.name,
    price: productData.price,
    stock: productData.stock || 0,
    desc: productData.desc || "",
    image: productData.image || "",
    sellerId: productData.sellerId,
    sellerName: productData.sellerName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  products.push(newProduct);
  writeProducts(products);
<<<<<<< HEAD
  
  console.log('✅ [Products] Produit créé:', newProduct.id, newProduct.name);
  
  // Notifier tous les acheteurs qu'un nouveau produit est disponible
  webhookService.notifyAllBuyers('product-created', {
    product: newProduct
  });
  
=======

  console.log("✅ [Products] Produit créé:", newProduct.id, newProduct.name);

>>>>>>> 759a47eb324414a1b039db0442e8cb1cc0f42c2e
  return newProduct;
};

// Mettre à jour un produit
exports.updateProduct = (productId, sellerId, updates) => {
  const products = readProducts();
  const index = products.findIndex((p) => p.id === productId);

  if (index === -1) {
    const error = new Error("Produit introuvable");
    error.statusCode = 404;
    throw error;
  }

  // Vérifier que le vendeur est le propriétaire
  if (products[index].sellerId !== sellerId) {
    const error = new Error(
      "Non autorisé: Vous n'êtes pas le propriétaire de ce produit"
    );
    error.statusCode = 403;
    throw error;
  }

  // Mettre à jour les champs autorisés
  if (updates.name !== undefined) products[index].name = updates.name;
  if (updates.price !== undefined) products[index].price = updates.price;
  if (updates.stock !== undefined) products[index].stock = updates.stock;
  if (updates.desc !== undefined) products[index].desc = updates.desc;
  if (updates.image !== undefined) products[index].image = updates.image;
  products[index].updatedAt = new Date().toISOString();

  writeProducts(products);
<<<<<<< HEAD
  
  console.log('✅ [Products] Produit mis à jour:', productId);
  
  // Notifier tous les utilisateurs de la mise à jour
  webhookService.notifyAll('product-updated', {
    product: products[index]
  });
  
=======

  console.log("✅ [Products] Produit mis à jour:", productId);

>>>>>>> 759a47eb324414a1b039db0442e8cb1cc0f42c2e
  return products[index];
};

// Supprimer un produit
exports.deleteProduct = (productId, sellerId) => {
  const products = readProducts();
  const index = products.findIndex((p) => p.id === productId);

  if (index === -1) {
    const error = new Error("Produit introuvable");
    error.statusCode = 404;
    throw error;
  }

  // Vérifier que le vendeur est le propriétaire
  if (products[index].sellerId !== sellerId) {
    const error = new Error(
      "Non autorisé: Vous n'êtes pas le propriétaire de ce produit"
    );
    error.statusCode = 403;
    throw error;
  }

  const deletedProduct = products.splice(index, 1)[0];
  writeProducts(products);
<<<<<<< HEAD
  
  console.log('🗑️ [Products] Produit supprimé:', productId);
  
  // Notifier tous les utilisateurs de la suppression
  webhookService.notifyAll('product-deleted', {
    productId: productId
  });
  
=======

  console.log("🗑️ [Products] Produit supprimé:", productId);

>>>>>>> 759a47eb324414a1b039db0442e8cb1cc0f42c2e
  return deletedProduct;
};

// Décrémenter le stock d'un produit (lors d'un achat)
exports.decrementStock = (productId, quantity = 1) => {
  const products = readProducts();
  const index = products.findIndex((p) => p.id === productId);

  if (index === -1) {
    const error = new Error("Produit introuvable");
    error.statusCode = 404;
    throw error;
  }

  if (products[index].stock < quantity) {
    const error = new Error("Stock insuffisant");
    error.statusCode = 400;
    throw error;
  }

  products[index].stock -= quantity;
  products[index].updatedAt = new Date().toISOString();

  writeProducts(products);

  console.log(
    "📦 [Products] Stock mis à jour:",
    productId,
    "nouveau stock:",
    products[index].stock
  );

  return products[index];
};
