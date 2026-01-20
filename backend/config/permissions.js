/**
 * Permissions configuration (DAC - Discretionary Access Control)
 * Map des ressources → actions → rôles autorisés
 */
module.exports = {
  products: {
    read: ["admin", "seller", "buyer", "guest"],
    create: ["seller", "admin"],
    update: ["seller", "admin"],
    delete: ["seller", "admin"]
  },
  orders: {
    read: ["admin", "seller", "buyer"],
    create: ["buyer", "admin"],
    update: ["seller", "admin"],
    cancel: ["buyer", "admin"]
  },
  dh: {
    read: ["admin", "seller", "buyer"],
    create: ["seller", "buyer"],
    admin: ["admin"]
  },
  users: {
    read: ["admin"],
    manage: ["admin"]
  }
};
