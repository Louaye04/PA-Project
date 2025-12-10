import React, { useEffect, useState } from 'react';
import './SellerDashboard.scss';
import Logo from '../Logo/Logo';
import SecureChat from '../SecureChat/SecureChat';
import { getMyProducts, createProduct, updateProduct, deleteProduct } from '../../utils/product-api';
import { getMyOrders, updateOrderStatus } from '../../utils/order-api';
import { connectWebhook, disconnectWebhook, onWebhookEvent } from '../../utils/webhook-client';
import { useToast } from '../../contexts/ToastContext';

const SellerDashboard = ({ userName }) => {
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
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

      const [productsData, ordersData] = await Promise.all([
        getMyProducts(),
        getMyOrders()
      ]);

      setProducts(productsData || []);
      setOrders(ordersData || []);
      setError(null);
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
    window.location.reload();
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

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'En attente', class: 'status-pending' },
      confirmed: { label: 'Confirmée', class: 'status-confirmed' },
      shipped: { label: 'Expédiée', class: 'status-shipped' },
      delivered: { label: 'Livrée', class: 'status-delivered' },
      cancelled: { label: 'Annulée', class: 'status-cancelled' }
    };
    const mapped = statusMap[status] || { label: status, class: 'status-default' };
    return <span className={`status-badge ${mapped.class}`}>{mapped.label}</span>;
  };

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
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.totalPrice, 0);

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
                        <span className="product-price">{p.price} DA</span>
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
                <select value={orderStatusFilter} onChange={(e) => { setOrderStatusFilter(e.target.value); setCurrentOrderPage(1); }}>
                  <option value="all">Tous</option>
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmée</option>
                  <option value="shipped">Expédiée</option>
                  <option value="delivered">Livrée</option>
                  <option value="cancelled">Annulée</option>
                </select>
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
                            <select
                              className="status-select"
                              value={o.status}
                              onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            >
                              <option value="pending">En attente</option>
                              <option value="confirmed">Confirmée</option>
                              <option value="shipped">Expédiée</option>
                              <option value="delivered">Livrée</option>
                              <option value="cancelled">Annulée</option>
                            </select>
                          </td>
                          <td>
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
  const [p, setP] = useState(() => ({
    name: initial.name || '',
    price: initial.price || '',
    stock: initial.stock || '',
    desc: initial.desc || '',
    image: initial.image || '',
    ...(initial.id && { id: initial.id })
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setP(prev => ({ ...prev, [name]: name === 'price' || name === 'stock' ? Number(value) : value }));
  };
  return (
    <form className="product-form" onSubmit={(e) => { e.preventDefault(); onSave(p); }}>
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
      <label>Image URL
        <input name="image" type="url" placeholder="https://example.com/image.jpg" value={p.image || ''} onChange={handleChange} />
        <small style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
          Entrez l'URL d'une image (optionnel)
        </small>
      </label>
      <div className="modal-actions">
        <button type="submit" className="btn">Enregistrer</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
