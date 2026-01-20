const permissions = require('../config/permissions');

/**
 * Middleware générique de contrôle d'accès (DAC)
 * Usage: checkPermission('products','create')
 * Vérifie que req.userRoles contient au moins un rôle autorisé.
 */
exports.checkPermission = (resource, action) => {
  return (req, res, next) => {
    try {
      const allowed = (permissions[resource] && permissions[resource][action]) || [];

      // build roles from req (middleware `authenticate` or `verifyToken` doit remplir req.userRoles)
      const userRoles = req.userRoles || (req.user ? (req.user.roles || (req.user.role ? [req.user.role] : [])) : []);

      // si aucune règle définie, ou si l'utilisateur ne correspond pas, renvoyer
      // une réponse générique pour éviter de divulguer des informations.
      if (!allowed || allowed.length === 0) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      const ok = allowed.some((r) => userRoles.includes(r));

      if (!ok) {
        return res.status(403).json({ error: 'Accès refusé' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
