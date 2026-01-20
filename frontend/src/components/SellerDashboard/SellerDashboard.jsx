import React, { useEffect, useState, useRef } from 'react';
import './SellerDashboard.scss';
import Logo from '../Logo/Logo';
import SecureChat from '../SecureChat/SecureChat';
import { getAllProducts, getMyProducts, createProduct, updateProduct, deleteProduct } from '../../utils/product-api';
import { getMyOrders, updateOrderStatus, getMyStats } from '../../utils/order-api';
import { connectWebhook, disconnectWebhook, onWebhookEvent } from '../../utils/webhook-client';
import { useToast } from '../../contexts/ToastContext';
import ButtonSelect from '../Shared/ButtonSelect';

const SellerDashboard = ({ userName, onLogout }) => {
  const toast = useToast();

  // Format price helper (show in Algerian dinars)
  const formatPriceDA = (val) => {
    const n = Number(val) || 0;
    return n.toLocaleString('fr-FR') + ' DA';
  };

  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [allProductsPage, setAllProductsPage] = useState(1);
  const [allProductsPerPage] = useState(5);
  const [selectedAllProduct, setSelectedAllProduct] = useState(null);
  const [showAllProductModal, setShowAllProductModal] = useState(false);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTab, setCurrentTab] = useState('products');

  const [modal, setModal] = useState({ open: false, mode: null, product: null });
  const [secureChatOpen, setSecureChatOpen] = useState(false);
  const [chatOrder, setChatOrder] = useState(null);
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  // Orders table state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState({ field: 'createdAt', direction: 'desc' });
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [ordersPerPage, setOrdersPerPage] = useState(10);
  const [currentOrderPage, setCurrentOrderPage] = useState(1);

  useEffect(() => {
    loadData();
    
    // Connecter au webhook pour les notifications en temps réel
    connectWebhook();
    
    // S'abonner aux événements
    const unsubscribeOrderCreated = onWebhookEvent('order-created', (data) => {
      console.log('📦 [SellerDashboard] Nouvelle commande reçue:', data.order);
      setAutoRefreshing(true);
      loadData(true); // Recharger les données silencieusement
      setTimeout(() => setAutoRefreshing(false), 1000);
    });
    
    const unsubscribeOrderUpdated = onWebhookEvent('order-updated', (data) => {
      console.log('📦 [SellerDashboard] Commande mise à jour:', data.order);
      setAutoRefreshing(true);
      loadData(true);
      setTimeout(() => setAutoRefreshing(false), 1000);
    });
    
    const unsubscribeDHSessionCreated = onWebhookEvent('dh-session-created', (data) => {
      console.log('🔐 [SellerDashboard] Nouvelle session DH:', data.sessionId);
      setAutoRefreshing(true);
      loadData(true);
      setTimeout(() => setAutoRefreshing(false), 1000);
    });
    
    // Cleanup
    return () => {
      unsubscribeOrderCreated();
      unsubscribeOrderUpdated();
      unsubscribeDHSessionCreated();
      disconnectWebhook();
    };
  }, []);

  // Load all site products (for 'Tous les produits' view)
  const loadAllProducts = async () => {
    try {
      const data = await getAllProducts();
      setAllProducts(data || []);
    } catch (err) {
      console.error('Erreur chargement tous les produits:', err);
    }
  };

  // When user switches to the all-products tab, fetch data
  useEffect(() => {
    if (currentTab === 'all-products') {
      loadAllProducts();
    }
  }, [currentTab]);

  const paginatedAllProducts = (() => {
    const start = (allProductsPage - 1) * allProductsPerPage;
    return allProducts.slice(start, start + allProductsPerPage);
  })();

  const totalAllProductPages = Math.max(1, Math.ceil(allProducts.length / allProductsPerPage));

  const openAllProductDetails = (p) => {
    setSelectedAllProduct(p);
    setShowAllProductModal(true);
  };

  const closeAllProductDetails = () => {
    setSelectedAllProduct(null);
    setShowAllProductModal(false);
  };

  const loadData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setAutoRefreshing(true);
      }
      
      const token = localStorage.getItem('authToken');

      if (!token) {
        setError('Non authentifié');
        return;
      }

      // Fetch seller products and orders
      try {
        const myProductsData = await getMyProducts();
        setProducts(myProductsData || []);
      } catch (err) {
        console.error('Erreur récupération mes produits:', err);
        if (!silent) setError(err.response?.data?.error || 'Erreur récupération produits');
      }

      try {
        const myOrdersData = await getMyOrders();
        setOrders(myOrdersData || []);
      } catch (err) {
        console.error('Erreur récupération commandes:', err);
      }

      // Récupérer les statistiques serveur (source de vérité pour les revenus)
      try {
        const s = await getMyStats();
        setStats(s || null);
      } catch (err) {
        console.error('Erreur récupération stats:', err);
        setStats(null);
      }

    } catch (err) {
      console.error('Erreur chargement données:', err);
      if (!silent) {
        setError(err.response?.data?.error || 'Erreur de chargement');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setAutoRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const appEl = document.querySelector('.app');
    const prevAppBg = appEl ? appEl.style.background : '';
    if (appEl) appEl.style.background = '#f6f7fb';
    return () => {
      if (appEl) appEl.style.background = prevAppBg || '';
    };
  }, []);

  const openAddModal = () => setModal({ open: true, mode: 'add', product: { name: '', price: '', stock: '', desc: '', image: '' } });
  const openEditModal = (p) => setModal({ open: true, mode: 'edit', product: { ...p } });
  const closeModal = () => setModal({ open: false, mode: null, product: null });

  const handleLogout = () => {
    try { localStorage.removeItem('authToken'); localStorage.removeItem('userEmail'); localStorage.removeItem('userName'); } catch (e) { }
    if (onLogout) {
      onLogout();
    } else {
      // fallback: reload the page
      window.location.reload();
    }
  };

  const saveProduct = async (prod) => {
    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        toast.error('Non authentifié. Veuillez vous reconnecter.');
        return;
      }

      console.log('💾 Sauvegarde produit:', { mode: modal.mode, product: prod });

      let response;
      if (modal.mode === 'add') {
        response = await createProduct(prod, token);
        toast.success(`✅ Produit créé: ${prod.name}`);
      } else if (modal.mode === 'edit') {
        response = await updateProduct(prod.id, prod, token);
        toast.success(`✅ Produit mis à jour: ${prod.name}`);
      }

      console.log('✅ Produit sauvegardé:', response);
      closeModal();
      await loadData();
    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      toast.error('Erreur: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    const ok = window.confirm(`Supprimer le produit « ${productName} » ?`);
    if (!ok) return;
    try {
      await deleteProduct(productId);
      toast.success(`🗑️ Produit supprimé: ${productName}`);
      await loadData();
    } catch (err) {
      toast.error('Erreur lors de la suppression: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`📦 Statut de commande mis à jour: ${status}`);
      await loadData();
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du statut: ' + (err.response?.data?.error || err.message));
    }
  };

  // Orders filtering, sorting, and pagination
  const filteredOrders = orders
    .filter(o => {
      const matchesSearch = orderSearch === '' ||
        o.productName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.buyerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.id.toString().includes(orderSearch);
      const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const { field, direction } = orderSort;
      let aVal = a[field];
      let bVal = b[field];

      if (field === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (field === 'totalPrice' || field === 'quantity') {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (direction === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

  const totalOrderPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentOrderPage - 1) * ordersPerPage,
    currentOrderPage * ordersPerPage
  );

  const handleOrderSort = (field) => {
    setOrderSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // getStatusBadge removed from SellerDashboard to avoid unused variable ESLint warning.

  if (loading) {
    return (
      <div className="seller-dashboard-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h2>Chargement...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seller-dashboard-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column' }}>
        <h2>Erreur: {error}</h2>
        <button className="btn" onClick={loadData}>Réessayer</button>
      </div>
    );
  }

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  // Calcul du chiffre d'affaires : inclure les commandes payées et livrées
  // Normalize status strings and compute revenue (align with backend)
  const normalizeStatus = (s) => {
    if (!s) return '';
    const st = String(s).toLowerCase().trim();
    if (st.includes('paid') || st === 'payée' || st === 'payee') return 'paid';
    if (st.includes('deliv') || st.includes('livr')) return 'delivered';
    if (st.includes('in_progress') || st.includes('in progress') || st.includes('en cours')) return 'in_progress';
    if (st.includes('await') || st.includes('en attente') || st.includes('awaiting')) return 'awaiting_payment';
    if (st.includes('cancel') || st.includes('annul')) return 'cancelled';
    if (st === 'accepted' || st === 'acceptée' || st === 'acceptee') return 'accepted';
    if (st === 'pending' || st === 'en attente') return 'pending';
    return st;
  };

  const revenueStatuses = ['paid', 'delivered', 'in_progress'];
  const totalRevenueLocal = orders
    .filter(o => revenueStatuses.includes(normalizeStatus(o.status)))
    .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  // Prefer server-provided stats when available
  const totalRevenue = (stats && typeof stats.totalRevenue === 'number') ? stats.totalRevenue : totalRevenueLocal;

  return (
    <div className="seller-dashboard-root">
      <aside className="seller-sidebar">
        <div className="sidebar-header">
          <Logo />
          <h3>Vendeur</h3>
        </div>
        <nav className="sidebar-nav">
          <button className={currentTab === 'products' ? 'active' : ''} onClick={() => setCurrentTab('products')}>
            📦 Mes Produits
          </button>
          <button className={currentTab === 'all-products' ? 'active' : ''} onClick={() => setCurrentTab('all-products')}>
            🛒 Tous les produits
          </button>
          <button className={currentTab === 'orders' ? 'active' : ''} onClick={() => setCurrentTab('orders')}>
            📋 Commandes
          </button>
          <button className={currentTab === 'stats' ? 'active' : ''} onClick={() => setCurrentTab('stats')}>
            📊 Statistiques
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>🚪 Se déconnecter</button>
        </div>
      </aside>

      <main className="seller-main">
        <header className="seller-topbar">
          <div className="search-wrapper">
            <div className="greeting">Bonjour, {userName}</div>
          </div>
          <div className="top-actions">
            {currentTab === 'products' && (
              <>
                <button className="btn add-product-btn" onClick={openAddModal}>
                  ➕ Ajouter un produit
                </button>
                <button className="btn inline-logout-btn" onClick={handleLogout} title="Se déconnecter">
                  🚪 Se déconnecter
                </button>
              </>
            )}
          </div>
        </header>

        {currentTab === 'products' && (
          <section className="products-view">
            <h2>Mes Produits</h2>
            {products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <p>Aucun produit pour le moment.</p>
                <button className="btn" onClick={openAddModal}>Créer votre premier produit</button>
              </div>
            ) : (
              <div className="products-grid">
                {products.map(p => (
                  <article key={p.id} className="product-card">
                    <div className="product-image">
                      {p.image ? (
                        <img src={p.image} alt={p.name} loading="lazy" />
                      ) : (
                        <div className="placeholder-image">📦</div>
                      )}
                    </div>
                    <div className="product-body">
                      <h3 className="product-name">{p.name}</h3>
                      <p className="product-desc">{p.desc}</p>
                      <div className="product-meta">
                        <span className="product-price">{formatPriceDA(p.price)}</span>
                        <span className="product-stock">Stock: {p.stock}</span>
                      </div>
                    </div>
                    <div className="product-actions">
                      <button className="action-btn edit-btn" onClick={() => openEditModal(p)}>✏️ Modifier</button>
                      <button className="action-btn delete-btn" onClick={() => handleDeleteProduct(p.id, p.name)}>🗑️ Supprimer</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {currentTab === 'all-products' && (
          <section className="all-products-view">
            <h2>Tous les produits du site</h2>
            {allProducts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🛒</div>
                <p>Aucun produit trouvé sur le site.</p>
              </div>
            ) : (
              <>
                <div className="all-products-table">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Image</th>
                        <th>Nom</th>
                        <th>Prix</th>
                        <th>Stock</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAllProducts.map((p, idx) => (
                        <tr key={p.id}>
                          <td>{(allProductsPage - 1) * allProductsPerPage + idx + 1}</td>
                          <td className="img-cell">
                            {p.image ? <img src={p.image} alt={p.name} /> : <div className="thumb">📦</div>}
                          </td>
                          <td className="name-cell">{p.name}</td>
                          <td className="price-cell">{formatPriceDA(p.price)}</td>
                          <td className="stock-cell">{p.stock}</td>
                          <td className="actions-cell">
                            <button className="btn details-btn" onClick={() => openAllProductDetails(p)}>Details</button>
                            {/* No edit/delete here for site-wide products (read-only for seller) */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="all-products-footer">
                  <div className="count">{(allProductsPage - 1) * allProductsPerPage + 1} - {Math.min(allProductsPage * allProductsPerPage, allProducts.length)} / {allProducts.length} produits</div>
                  <div className="pagination">
                    <button className="page-btn" disabled={allProductsPage === 1} onClick={() => setAllProductsPage(1)}>««</button>
                    <button className="page-btn" disabled={allProductsPage === 1} onClick={() => setAllProductsPage(prev => Math.max(1, prev - 1))}>‹</button>
                    <span className="page-numbers">Page {allProductsPage} / {totalAllProductPages}</span>
                    <button className="page-btn" disabled={allProductsPage === totalAllProductPages} onClick={() => setAllProductsPage(prev => Math.min(totalAllProductPages, prev + 1))}>›</button>
                    <button className="page-btn" disabled={allProductsPage === totalAllProductPages} onClick={() => setAllProductsPage(totalAllProductPages)}>»»</button>
                  </div>
                </div>

                {showAllProductModal && selectedAllProduct && (
                  <div className="sd-modal" role="dialog" aria-modal="true">
                    <div className="sd-modal-backdrop" onClick={closeAllProductDetails} />
                    <div className="sd-modal-panel">
                      <h3>Détails du produit</h3>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ width: 160 }}>
                          {selectedAllProduct.image ? <img src={selectedAllProduct.image} alt={selectedAllProduct.name} style={{ width: '100%', borderRadius: 8 }} /> : <div style={{ height: 120, background: 'rgba(255,255,255,0.03)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📦</div>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <h4>{selectedAllProduct.name}</h4>
                          <p style={{ color: 'var(--text-secondary)' }}>{selectedAllProduct.desc}</p>
                          <p><strong>Prix:</strong> {formatPriceDA(selectedAllProduct.price)}</p>
                          <p><strong>Stock:</strong> {selectedAllProduct.stock}</p>
                          <p><strong>Vendeur:</strong> {selectedAllProduct.sellerName || selectedAllProduct.owner || '—'}</p>
                        </div>
                      </div>
                      <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <button className="btn ghost" onClick={closeAllProductDetails}>Fermer</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {currentTab === 'orders' && (
          <section className="orders-view">
            <div className="orders-header">
              <h2>Commandes</h2>
              <div className="orders-stats">
                <div className="stat-badge">
                  <span className="stat-label">Total</span>
                  <span className="stat-value">{orders.length}</span>
                </div>
                <div className="stat-badge">
                  <span className="stat-label">Affichées</span>
                  <span className="stat-value">{filteredOrders.length}</span>
                </div>
              </div>
            </div>

            <div className="orders-controls">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher par produit, client ou numéro..."
                  value={orderSearch}
                  onChange={(e) => { setOrderSearch(e.target.value); setCurrentOrderPage(1); }}
                />
                {orderSearch && (
                  <button className="clear-btn" onClick={() => setOrderSearch('')}>✕</button>
                )}
              </div>

              <div className="filter-group">
                <label>Statut:</label>
                <label className="select-label">
                  <select value={orderStatusFilter} onChange={(e) => { setOrderStatusFilter(e.target.value); setCurrentOrderPage(1); }}>
                    <option value="all">Tous</option>
                    <option value="pending">Commandes en attente</option>
                    <option value="accepted">Commandes acceptées</option>
                    <option value="awaiting_payment">Commandes en attente de paiement</option>
                    <option value="paid">Commandes payées</option>
                    <option value="in_progress">Commandes en cours</option>
                    <option value="shipped">Commandes expédiées</option>
                    <option value="delivered">Commandes livrées</option>
                    <option value="cancelled">Annulées</option>
                  </select>
                </label>
              </div>

              <div className="filter-group">
                <label>Par page:</label>
                <select value={ordersPerPage} onChange={(e) => { setOrdersPerPage(Number(e.target.value)); setCurrentOrderPage(1); }}>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <p>Aucune commande pour le moment.</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>Aucune commande ne correspond à vos critères.</p>
                <button className="btn ghost" onClick={() => { setOrderSearch(''); setOrderStatusFilter('all'); }}>
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              <>
                <div className="table-container">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleOrderSort('id')} className="sortable">
                          <span>N° Commande</span>
                          {orderSort.field === 'id' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleOrderSort('createdAt')} className="sortable">
                          <span>Date</span>
                          {orderSort.field === 'createdAt' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleOrderSort('productName')} className="sortable">
                          <span>Produit</span>
                          {orderSort.field === 'productName' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleOrderSort('buyerName')} className="sortable">
                          <span>Client</span>
                          {orderSort.field === 'buyerName' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleOrderSort('quantity')} className="sortable text-center">
                          <span>Qté</span>
                          {orderSort.field === 'quantity' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleOrderSort('totalPrice')} className="sortable text-right">
                          <span>Total</span>
                          {orderSort.field === 'totalPrice' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map(o => (
                        <tr key={o.id}>
                          <td className="order-id">#{o.id}</td>
                          <td className="order-date">{new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="product-name">{o.productName}</td>
                          <td className="buyer-name">{o.buyerName}</td>
                          <td className="text-center">×{o.quantity}</td>
                          <td className="text-right price-cell">{o.totalPrice.toLocaleString()} DA</td>
                          <td>
                            {/* Button-style select */}
                            <div className="status-button-wrapper">
                              {/** lazy-load shared component to avoid breaking imports */}
                              <React.Suspense fallback={<div className="status-fallback">{o.status}</div>}>
                                <ButtonSelect
                                  value={o.status}
                                  options={[
                                    { value: 'pending', label: 'En attente' },
                                    { value: 'accepted', label: 'Acceptée' },
                                    { value: 'awaiting_payment', label: 'En attente de paiement' },
                                    { value: 'paid', label: 'Payée' },
                                    { value: 'in_progress', label: 'En cours' },
                                    { value: 'shipped', label: 'Expédiée' },
                                    { value: 'delivered', label: 'Livrée' },
                                    { value: 'cancelled', label: 'Annulée' },
                                  ]}
                                  onChange={(newStatus) => handleUpdateOrderStatus(o.id, newStatus)}
                                />
                              </React.Suspense>
                            </div>
                          </td>
                          <td>
                            {o.status === 'pending' && (
                              <button
                                className="accept-btn"
                                onClick={() => handleUpdateOrderStatus(o.id, 'accepted')}
                              >
                                Accepter la commande
                              </button>
                            )}
                            <button
                              className="chat-btn"
                              onClick={() => {
                                setChatOrder(o);
                                setSecureChatOpen(true);
                              }}
                            >
                              💬
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalOrderPages > 1 && (
                  <div className="pagination">
                    <button className="page-btn" disabled={currentOrderPage === 1} onClick={() => setCurrentOrderPage(1)}>««</button>
                    <button className="page-btn" disabled={currentOrderPage === 1} onClick={() => setCurrentOrderPage(prev => prev - 1)}>‹</button>

                    <div className="page-numbers">
                      {Array.from({ length: totalOrderPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (totalOrderPages <= 7) return true;
                          if (page === 1 || page === totalOrderPages) return true;
                          if (Math.abs(page - currentOrderPage) <= 1) return true;
                          return false;
                        })
                        .map((page, idx, arr) => (
                          <React.Fragment key={page}>
                            {idx > 0 && arr[idx - 1] !== page - 1 && <span className="ellipsis">...</span>}
                            <button className={`page-btn ${currentOrderPage === page ? 'active' : ''}`} onClick={() => setCurrentOrderPage(page)}>
                              {page}
                            </button>
                          </React.Fragment>
                        ))
                      }
                    </div>

                    <button className="page-btn" disabled={currentOrderPage === totalOrderPages} onClick={() => setCurrentOrderPage(prev => prev + 1)}>›</button>
                    <button className="page-btn" disabled={currentOrderPage === totalOrderPages} onClick={() => setCurrentOrderPage(totalOrderPages)}>»»</button>

                    <span className="page-info">Page {currentOrderPage} sur {totalOrderPages}</span>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {currentTab === 'stats' && (
          <section className="stats-view">
            <h2>Statistiques</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-content">
                  <div className="stat-label">Total Produits</div>
                  <div className="stat-value">{products.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-content">
                  <div className="stat-label">Total Commandes</div>
                  <div className="stat-value">{orders.length}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <div className="stat-content">
                  <div className="stat-label">En Attente</div>
                  <div className="stat-value">{pendingOrders}</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <div className="stat-label">Revenus Totaux</div>
                  <div className="stat-value">{totalRevenue.toLocaleString()} DA</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {modal.open && (
        <div className="sd-modal" role="dialog" aria-modal="true">
          <div className="sd-modal-backdrop" onClick={closeModal} />
          <div className="sd-modal-panel">
            <ProductForm product={modal.product} onSave={saveProduct} onCancel={closeModal} />
          </div>
        </div>
      )}

      {secureChatOpen && chatOrder && (() => {
        // Décoder le JWT pour obtenir l'ID utilisateur numérique
        const token = localStorage.getItem('authToken') || '';
        const userEmail = localStorage.getItem('userEmail') || 'seller@example.com';
        let currentUserId = userEmail;
        
        try {
          if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            currentUserId = payload.id || payload.email;
          }
        } catch (e) {
          console.error('Erreur décodage token:', e);
        }
        
        return (
        <SecureChat
          currentUser={{
            id: currentUserId,
            email: userEmail,
            name: userName || 'Vendeur',
            role: 'seller'
          }}
          otherUser={{
            id: chatOrder.buyerId,
            email: chatOrder.buyerId,
            name: chatOrder.buyerName,
            role: 'buyer'
          }}
          productId={chatOrder.productId.toString()}
          token={token}
          onClose={() => {
            setSecureChatOpen(false);
            setChatOrder(null);
          }}
        />
        );
      })()}
    </div>
  );
};

export default SellerDashboard;

function ProductForm({ product: initial, onSave, onCancel }) {
  const toast = useToast();
  const [p, setP] = useState(() => ({
    name: initial.name || '',
    price: initial.price || '',
    stock: initial.stock || '',
    desc: initial.desc || '',
    image: initial.image || '',
    ...(initial.id && { id: initial.id })
  }));

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // Only images
    if (!file.type.startsWith('image/')) return;

    // Allow very large images up to ~20 TB per user request.
    // WARNING: loading huge files into memory will likely crash the browser.
    const MAX_BYTES = 20 * 1024 ** 4; // ~21990232555520 bytes (20 TB)
    if (file.size > MAX_BYTES) {
      const msg = 'Image trop volumineuse (max 20TB). Choisissez une image plus petite.';
      if (typeof toast?.error === 'function') {
        toast.error(msg);
      } else {
        alert(msg);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setP(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setP(prev => ({ ...prev, [name]: name === 'price' || name === 'stock' ? Number(value) : value }));
  };

  const isFormValid = () => {
    const nameOk = p.name && String(p.name).trim().length > 0;
    const descOk = p.desc && String(p.desc).trim().length > 0;
    const priceNum = Number(p.price);
    const stockNum = Number(p.stock);
    const priceOk = Number.isFinite(priceNum) && priceNum > 0;
    const stockOk = Number.isFinite(stockNum) && stockNum >= 0;
    const imageOk = p.image && String(p.image).trim().length > 0;
    return nameOk && descOk && priceOk && stockOk && imageOk;
  };

  const handleSubmitProduct = (e) => {
    e.preventDefault();
    if (!isFormValid()) {
      // simple UX: focus first invalid field
      if (!p.name || String(p.name).trim().length === 0) {
        const el = document.querySelector('.product-form [name="name"]');
        if (el) el.focus();
      }
      return;
    }
    onSave(p);
  };

  return (
    <form className="product-form" onSubmit={handleSubmitProduct}>
      <h3>{initial.id ? 'Modifier le produit' : 'Ajouter un produit'}</h3>
      <label>Nom
        <input name="name" value={p.name} onChange={handleChange} required />
      </label>
      <label>Prix (DA)
        <input name="price" type="number" inputMode="decimal" step="0.01" min="0" value={p.price} onChange={handleChange} required />
      </label>
      <label>Stock
        <input name="stock" type="number" inputMode="numeric" step="1" min="0" value={p.stock} onChange={handleChange} required />
      </label>
      <label>Description
        <textarea name="desc" value={p.desc} onChange={handleChange} />
      </label>
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" className="btn" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
          Ajouter une image
        </button>
        {p.image && (
          <div style={{ width: 80, height: 60, borderRadius: 8, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.6)' }}>
            <img src={p.image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>
      <div className="modal-actions">
        <button type="submit" className="btn" disabled={!isFormValid()} aria-disabled={!isFormValid()}>Enregistrer</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
