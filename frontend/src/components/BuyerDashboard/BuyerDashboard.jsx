import React, { useEffect, useState } from 'react';
import './BuyerDashboard.scss';
import Logo from '../Logo/Logo';
import SecureChat from '../SecureChat/SecureChat';
import { getAllProducts } from '../../utils/product-api';
import { createOrder, getMyOrders, cancelOrder } from '../../utils/order-api';
import { connectWebhook, disconnectWebhook, onWebhookEvent } from '../../utils/webhook-client';
import { useToast } from '../../contexts/ToastContext';

const BuyerDashboard = ({ userName }) => {
  const toast = useToast();

  const PRODUCT_IMAGES = [
    'https://images.unsplash.com/photo-1528701800489-20be9fbf7c54?auto=format&fit=crop&w=900&q=80', // sneakers
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=900&q=80', // apparel
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=80', // watch
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80', // bag
    'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80', // headphones
    'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80'  // camera
  ];

  const productImageFor = (product, idx = 0) => product.image || PRODUCT_IMAGES[idx % PRODUCT_IMAGES.length];

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    try { const raw = localStorage.getItem('buyerCart'); if (raw) return JSON.parse(raw); } catch (e) { }
    return [];
  });
  const [query, setQuery] = useState('');
  const [currentTab, setCurrentTab] = useState('home');
  const [productModal, setProductModal] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try { const raw = localStorage.getItem('buyerFavorites'); if (raw) return JSON.parse(raw); } catch (e) { }
    return [];
  });
  const [orders, setOrders] = useState([]);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settings, setSettings] = useState(() => ({ currency: 'DA', timezone: 'Africa/Algiers', contactEmail: 'support@bkh.example' }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Orders table state
  const [orderSearch, setOrderSearch] = useState('');
  const [orderSort, setOrderSort] = useState({ field: 'createdAt', direction: 'desc' });
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [ordersPerPage, setOrdersPerPage] = useState(10);
  const [currentOrderPage, setCurrentOrderPage] = useState(1);

  const handleLogout = () => {
    try { localStorage.removeItem('authToken'); localStorage.removeItem('userEmail'); localStorage.removeItem('userName'); } catch (e) { }
    window.location.reload();
  };

  const [checkout, setCheckout] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [cartVisible, setCartVisible] = useState(false);
  const [secureChatOpen, setSecureChatOpen] = useState(false);
  const [chatProduct, setChatProduct] = useState(null);
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  const loadData = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setAutoRefreshing(true);
      }
      setError(null);
      
      const [productsData, ordersData] = await Promise.all([
        getAllProducts(),
        getMyOrders()
      ]);
      setProducts(productsData);
      setOrders(ordersData);
    } catch (err) {
      if (!silent) {
        setError(err.response?.data?.error || err.message);
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
    loadData();
    
    // Connecter au webhook pour les notifications en temps réel
    connectWebhook();
    
    // S'abonner aux événements
    const unsubscribeProductCreated = onWebhookEvent('product-created', (data) => {
      console.log('🛍️ [BuyerDashboard] Nouveau produit disponible:', data.product.name);
      setAutoRefreshing(true);
      loadData(true); // Recharger les données silencieusement
      setTimeout(() => setAutoRefreshing(false), 1000);
    });
    
    const unsubscribeProductUpdated = onWebhookEvent('product-updated', (data) => {
      console.log('🛍️ [BuyerDashboard] Produit mis à jour:', data.product.name);
      setAutoRefreshing(true);
      loadData(true);
      setTimeout(() => setAutoRefreshing(false), 1000);
    });
    
    const unsubscribeProductDeleted = onWebhookEvent('product-deleted', (data) => {
      console.log('🛍️ [BuyerDashboard] Produit supprimé:', data.productId);
      setAutoRefreshing(true);
      loadData(true);
      setTimeout(() => setAutoRefreshing(false), 1000);
    });
    
    const unsubscribeOrderUpdated = onWebhookEvent('order-updated', (data) => {
      console.log('📦 [BuyerDashboard] Commande mise à jour:', data.order);
      setAutoRefreshing(true);
      loadData(true);
      setTimeout(() => setAutoRefreshing(false), 1000);
    });
    
    // Cleanup
    return () => {
      unsubscribeProductCreated();
      unsubscribeProductUpdated();
      unsubscribeProductDeleted();
      unsubscribeOrderUpdated();
      disconnectWebhook();
    };
  }, []);

  useEffect(() => {
    // Do not modify the document body background here — keep the app neutral and professional.
    const appEl = document.querySelector('.app');
    const prevAppBg = appEl ? appEl.style.background : '';
    if (appEl) appEl.style.background = '#f6f7fb';
    return () => {
      if (appEl) appEl.style.background = prevAppBg || '';
    };
  }, []);

  useEffect(() => { try { localStorage.setItem('buyerCart', JSON.stringify(cart)); } catch (e) { } }, [cart]);
  useEffect(() => { try { localStorage.setItem('buyerFavorites', JSON.stringify(favorites)); } catch (e) { } }, [favorites]);

  const toggleFavorite = (product) => {
    setFavorites(prev => {
      const exists = prev.find(x => x.id === product.id);
      if (exists) {
        toast.info(`Retiré des favoris: ${product.name}`);
        return prev.filter(x => x.id !== product.id);
      }
      toast.success(`Ajouté aux favoris: ${product.name}`);
      return [...prev, product];
    });
  };

  const addToCart = (p) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === p.id);
      const stock = Number(p.stock) || 0;
      if (stock <= 0) {
        toast.error(`Rupture de stock: ${p.name}`);
        return prev;
      }
      if (existing) {
        if (existing.qty >= stock) {
          toast.error(`Limite atteinte (${stock}) pour: ${p.name}`);
          return prev;
        }
        toast.info(`Quantité augmentée: ${p.name}`);
        return prev.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x);
      }
      toast.success(`Ajouté au panier: ${p.name}`);
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const removeFromCart = (id) => {
    const item = cart.find(x => x.id === id);
    if (item) toast.warning(`Retiré du panier: ${item.name}`);
    setCart(prev => prev.filter(x => x.id !== id));
  };
  const updateQty = (id, qty) => {
    setCart(prev => prev.map(x => {
      if (x.id !== id) return x;
      const prod = products.find(p => p.id === id) || x;
      const stock = Number(prod.stock) || 0;
      const clamped = Math.max(1, Math.min(stock || qty, Number(qty)));
      if (qty > stock) {
        if (typeof toast?.error === 'function') toast.error(`Seulement ${stock} en stock`);
      }
      return { ...x, qty: clamped };
    }));
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.desc.toLowerCase().includes(query.toLowerCase()));

  // Orders filtering, sorting, and pagination
  const filteredOrders = orders
    .filter(o => {
      const matchesSearch = orderSearch === '' ||
        o.productName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.sellerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.id.toString().includes(orderSearch);
      const norm = normalizeStatus(o.status);
      const matchesStatus = orderStatusFilter === 'all' || norm === orderStatusFilter;
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

  function normalizeStatus(s) {
    if (!s) return 'unknown';
    const v = String(s).toLowerCase().trim();
    const map = {
      'en attente': 'pending',
      'en attente de validation': 'pending',
      'pending': 'pending',
      'acceptée – en attente de paiement': 'awaiting_payment',
      'acceptée - en attente de paiement': 'awaiting_payment',
      'acceptée': 'awaiting_payment',
      'confirmée': 'awaiting_payment',
      'awaiting_payment': 'awaiting_payment',
      'payée': 'paid',
      'paye': 'paid',
      'paid': 'paid',
      'en cours de préparation': 'in_progress',
      'en cours de preparation': 'in_progress',
      'in_progress': 'in_progress',
      'expédiée': 'shipped',
      'expediee': 'shipped',
      'shipped': 'shipped',
      'livrée': 'delivered',
      'livree': 'delivered',
      'delivered': 'delivered',
      'annulée': 'cancelled',
      'annulee': 'cancelled',
      'cancelled': 'cancelled',
    };
    return map[v] || v;
  }

  const getStatusBadge = (status) => {
    // Map backend status codes to the requested French workflow labels
    const statusMap = {
      pending: { label: 'En attente de validation', class: 'status-pending' },
      awaiting_payment: { label: 'Acceptée – En attente de paiement', class: 'status-awaiting-payment' },
      paid: { label: 'Payée', class: 'status-paid' },
      in_progress: { label: 'En cours de préparation', class: 'status-in-progress' },
      shipped: { label: 'Expédiée', class: 'status-shipped' },
      delivered: { label: 'Livrée', class: 'status-delivered' },
      cancelled: { label: 'Annulée', class: 'status-cancelled' }
    };
    const key = normalizeStatus(status);
    const mapped = statusMap[key] || { label: String(status), class: 'status-default' };
    return <span className={`status-badge ${mapped.class}`}>{mapped.label}</span>;
  };

  // Normalize legacy/french status labels to internal keys (declaration above)

  // Note: status flow renderer removed because it wasn't used; keep order status badges via `getStatusBadge`.

  const handleCancel = async (orderId) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette commande ?')) return;
    try {
      await cancelOrder(orderId);
      toast.success('Commande annulée');
      await loadData();
    } catch (err) {
      toast.error('Impossible d\'annuler la commande: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="buyer-dashboard-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <h2>Chargement...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="buyer-dashboard-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column' }}>
        <h2>Erreur: {error}</h2>
        <button className="btn" onClick={loadData}>Réessayer</button>
      </div>
    );
  }

  return (
    <div className="buyer-dashboard-root">
      <aside className="buyer-sidebar">
        <div className="brand"><Logo size={44} /><div className="brand-name">BKH Shop</div></div>
        <nav className="nav-list">
          <button className={`nav-item ${currentTab === 'home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>Accueil</button>
          <button className={`nav-item ${currentTab === 'orders' ? 'active' : ''}`} onClick={() => setCurrentTab('orders')}>Mes commandes</button>
          <button className={`nav-item ${currentTab === 'favorites' ? 'active' : ''}`} onClick={() => setCurrentTab('favorites')}>Favoris</button>
          <button className={`nav-item ${currentTab === 'help' ? 'active' : ''}`} onClick={() => setCurrentTab('help')}>Aide</button>
          <button className={`nav-item ${currentTab === 'settings' ? 'active' : ''}`} onClick={() => setCurrentTab('settings')}>Paramètres</button>
        </nav>
      </aside>

      <main className="buyer-main">
        <header className="buyer-topbar">
          <div className="search-wrapper">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher des produits, ex: Chaussures" />
            {autoRefreshing && <span className="refresh-indicator">🔄</span>}
          </div>
          <div className="top-actions">
            <div className="greeting">Bonjour {userName}</div>
            <button className="cart-btn" onClick={() => setCartVisible(v => !v)} aria-expanded={cartVisible} aria-controls="cart-drawer">🛒 Panier <span className="cart-count">({cart.reduce((s, i) => s + i.qty, 0)})</span></button>
            <button className="btn ghost" onClick={handleLogout}>Se déconnecter</button>
          </div>
        </header>

        {/* Main content area changes based on selected tab */}
        {currentTab === 'home' && (
          <>
            <section className="hero">
              <div className="hero-inner">
                <h1>Retrouvez les meilleures offres</h1>
                <p>Produits sélectionnés pour vous — livraison rapide en Algérie</p>
              </div>
            </section>

            <section className="catalog">
              <h2>Produits</h2>
              <div className="grid">
                {filtered.length === 0 ? (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>
                    {products.length === 0 ? 'Aucun produit disponible pour le moment.' : 'Aucun produit ne correspond à votre recherche.'}
                  </div>
                ) : (
                  filtered.map((p, idx) => {
                    const img = productImageFor(p, idx);
                    return (
                      <article key={p.id} className="card">
                        <div className="card-header">
                          <div className="card-title">{p.name}</div>
                          <div className="card-seller">{p.sellerName || p.seller}</div>
                          <button
                            className={`fav-toggle ${favorites.find(x => x.id === p.id) ? 'active' : ''}`}
                            onClick={() => toggleFavorite(p)}
                            aria-label={favorites.find(x => x.id === p.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          >
                            <span className="heart" aria-hidden="true">♥</span>
                          </button>
                        </div>
                        <div className="card-media">
                          <img src={img} alt={`Visuel de ${p.name}`} loading="lazy" />
                        </div>
                        <div className="card-body">
                          <p className="desc">{p.desc}</p>
                        </div>
                        <div className="card-footer">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="price">{p.price} DA</div>
                            <div className="stock-label">{(Number(p.stock) || 0) > 0 ? `En stock: ${p.stock}` : 'Rupture de stock'}</div>
                          </div>
                          <div className="actions">
                            <button className="btn secure-buy" onClick={async () => {
                              const qty = prompt('Quantité à commander:', '1');
                              if (!qty || isNaN(qty) || qty <= 0) return;
                              try {
                                await createOrder({ productId: p.id, quantity: Number(qty) });
                                toast.success(`Commande créée: ${p.name} (x${qty})`);
                                await loadData();
                                setChatProduct(p);
                                setSecureChatOpen(true);
                              } catch (err) {
                                toast.error('Erreur lors de la commande: ' + (err.response?.data?.error || err.message));
                              }
                            }}>🔐 Acheter avec Canal Sécurisé</button>
                            <button className="btn" onClick={() => addToCart(p)} disabled={(Number(p.stock) || 0) <= 0} title={(Number(p.stock) || 0) <= 0 ? 'Rupture de stock' : 'Ajouter au panier'}>Ajouter au panier</button>
                            <button className="btn ghost" onClick={() => setProductModal(p)}>Voir</button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </>
        )}

        {currentTab === 'orders' && (
          <section className="orders-view">
            <div className="orders-header">
              <h2>Mes commandes</h2>
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
                  placeholder="Rechercher par produit, vendeur ou numéro..."
                  value={orderSearch}
                  onChange={(e) => { setOrderSearch(e.target.value); setCurrentOrderPage(1); }}
                />
                {orderSearch && (
                  <button className="clear-btn" onClick={() => setOrderSearch('')}>✕</button>
                )}
              </div>

              <div className="filter-group">
                <label className="select-label">Statut:
                  <select value={orderStatusFilter} onChange={(e) => { setOrderStatusFilter(e.target.value); setCurrentOrderPage(1); }}>
                    <option value="all">Tous</option>
                    <option value="pending">En attente</option>
                    <option value="awaiting_payment">Acceptée – En attente de paiement</option>
                    <option value="paid">Payée</option>
                    <option value="in_progress">En cours de préparation</option>
                    <option value="shipped">Expédiée</option>
                    <option value="delivered">Livrée</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </label>
              </div>

              <div className="filter-group">
                <label className="select-label no-arrow">Par page:
                  <select value={ordersPerPage} onChange={(e) => { setOrdersPerPage(Number(e.target.value)); setCurrentOrderPage(1); }}>
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </label>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
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
                        <th onClick={() => handleOrderSort('sellerName')} className="sortable">
                          <span>Vendeur</span>
                          {orderSort.field === 'sellerName' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleOrderSort('quantity')} className="sortable text-center">
                          <span>Qté</span>
                          {orderSort.field === 'quantity' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleOrderSort('totalPrice')} className="sortable text-right">
                          <span>Total</span>
                          {orderSort.field === 'totalPrice' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                        <th onClick={() => handleOrderSort('status')} className="sortable">
                          <span>Statut</span>
                          {orderSort.field === 'status' && <span className="sort-icon">{orderSort.direction === 'asc' ? '↑' : '↓'}</span>}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map(o => (
                        <tr key={o.id}>
                          <td className="order-id">#{o.id}</td>
                          <td className="order-date">{new Date(o.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="product-name">{o.productName}</td>
                          <td className="seller-name">{o.sellerName}</td>
                          <td className="text-center">×{o.quantity}</td>
                          <td className="text-right price-cell">{o.totalPrice.toLocaleString()} DA</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {getStatusBadge(o.status)}
                              {normalizeStatus(o.status) === 'pending' && (
                                <button className="btn ghost" onClick={() => handleCancel(o.id)}>
                                  Annuler
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalOrderPages > 1 && (
                  <div className="pagination">
                    <button
                      className="page-btn"
                      disabled={currentOrderPage === 1}
                      onClick={() => setCurrentOrderPage(1)}
                    >
                      ««
                    </button>
                    <button
                      className="page-btn"
                      disabled={currentOrderPage === 1}
                      onClick={() => setCurrentOrderPage(prev => prev - 1)}
                    >
                      ‹
                    </button>

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
                            <button
                              className={`page-btn ${currentOrderPage === page ? 'active' : ''}`}
                              onClick={() => setCurrentOrderPage(page)}
                            >
                              {page}
                            </button>
                          </React.Fragment>
                        ))
                      }
                    </div>

                    <button
                      className="page-btn"
                      disabled={currentOrderPage === totalOrderPages}
                      onClick={() => setCurrentOrderPage(prev => prev + 1)}
                    >
                      ›
                    </button>
                    <button
                      className="page-btn"
                      disabled={currentOrderPage === totalOrderPages}
                      onClick={() => setCurrentOrderPage(totalOrderPages)}
                    >
                      »»
                    </button>

                    <span className="page-info">
                      Page {currentOrderPage} sur {totalOrderPages}
                    </span>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {currentTab === 'favorites' && (
          <section className="favorites-view">
            <h2>Favoris</h2>
            {favorites.length === 0 ? <div>Aucun favori pour le moment.</div> : (
              <div className="grid">
                {favorites.map((f, idx) => {
                  const img = productImageFor(f, idx);
                  return (
                    <article className="card" key={f.id}>
                      <button
                        className="fav-toggle active"
                        onClick={() => toggleFavorite(f)}
                        aria-label="Retirer des favoris"
                      >
                        <span className="heart" aria-hidden="true">♥</span>
                      </button>
                      <div className="card-media"><img src={img} alt={`Visuel de ${f.name}`} loading="lazy" /></div>
                      <div className="card-body">
                        <div className="card-title">{f.name}</div>
                        <div className="card-seller">Par {f.sellerName || f.seller}</div>
                        {f.desc && <p className="desc">{f.desc}</p>}
                      </div>
                      <div className="card-footer">
                        <div className="price">{f.price} DA</div>
                        <div className="actions">
                          <button className="btn" onClick={() => setProductModal(f)}>Voir</button>
                          <button className="btn ghost" onClick={() => addToCart(f)}>Ajouter</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {currentTab === 'help' && (
          <section className="help-view">
            <h2>Aide & Support</h2>
            <h4>FAQ</h4>
            <ul>
              <li>Comment suivre ma commande ? — Allez dans Mes commandes et consultez le statut.</li>
              <li>Modes de paiement acceptés — Carte Visa, Mastercard (simulation).</li>
              <li>Livraison — 3-7 jours ouvrés selon disponibilité.</li>
            </ul>
            <h4>Contact</h4>
            <p>support@bkh.example</p>
          </section>
        )}

        {currentTab === 'settings' && (
          <section className="settings-view">
            <h2>Paramètres</h2>
            <form className="settings-form" onSubmit={(e) => { e.preventDefault(); setSettingsSaved(true); try { localStorage.setItem('buyerSettings', JSON.stringify(settings)); } catch (e) { }; setTimeout(() => setSettingsSaved(false), 3000); }}>
              <div className="form-row"><label className="select-label">Devise par défaut<select value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })}><option>DA</option><option>EUR</option><option>USD</option></select></label></div>
              <div className="form-row"><label className="select-label">Fuseau horaire<select value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}><option>Africa/Algiers</option><option>UTC</option><option>Europe/Paris</option></select></label></div>
              <div className="form-row"><label>Email de contact<input value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })} /></label></div>
              <div className="form-actions"><button className="btn" type="submit">Enregistrer</button></div>
              {settingsSaved && <div className="save-banner success">Paramètres enregistrés avec succès.</div>}
            </form>
          </section>
        )}

        {cartVisible && (
          <div className="cart-drawer" id="cart-drawer" role="dialog" aria-modal="true">
            <div className="cart-backdrop" onClick={() => setCartVisible(false)} />
            <div className="cart-panel">
              <div className="cart-header"><h3>Panier</h3><button className="btn ghost" onClick={() => setCartVisible(false)}>Fermer</button></div>
              {cart.length === 0 ? <div className="empty">Votre panier est vide</div> : (
                <div className="cart-list">
                  {cart.map(i => (
                    <div key={i.id} className="cart-row">
                      <div className="cart-name">{i.name}</div>
                      <div className="cart-qty">
                        <button className="qty-btn" onClick={() => updateQty(i.id, Math.max(1, i.qty - 1))} disabled={i.qty <= 1}>-</button>
                        <span className="qty-value">{i.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(i.id, i.qty + 1)} disabled={i.qty >= (Number(i.stock) || 0)} title={i.qty >= (Number(i.stock) || 0) ? 'Plus de stock disponible' : 'Augmenter la quantité'}>+</button>
                      </div>
                      <div className="cart-price">{i.price * i.qty} DA</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>{(Number(i.stock) || 0) - i.qty} restants</div>
                      <button className="remove" onClick={() => removeFromCart(i.id)}>Supprimer</button>
                    </div>
                  ))}
                  <div className="cart-total">Total : {cart.reduce((s, i) => s + i.price * i.qty, 0)} DA</div>
                  <button className="checkout" onClick={() => { setCheckout({ open: true }); setCartVisible(false); }}>Passer au paiement</button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Checkout modal (simulated) */}
        {checkout?.open && (
          <div className="checkout-modal" role="dialog" aria-modal="true">
            <div className="cm-backdrop" onClick={() => setCheckout(null)} />
            <div className="cm-panel">
              <h3>Paiement sécurisé</h3>
              <p>Montant à régler: <strong>{cart.reduce((s, i) => s + i.price * i.qty, 0)} DA</strong></p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setPaymentResult({ success: null, message: 'Traitement en cours...' });
                try {
                  for (const item of cart) {
                    await createOrder({ productId: item.id, quantity: item.qty });
                  }
                  setPaymentResult({ success: true, message: 'Paiement accepté — Merci pour votre commande.' });
                  toast.success(`✅ Commande validée! ${cart.length} produit(s) commandé(s)`);
                  setCart([]);
                  await loadData();
                  setTimeout(() => {
                    setCheckout(null);
                    setPaymentResult(null);
                  }, 2000);
                } catch (err) {
                  const errorMsg = 'Erreur: ' + (err.response?.data?.error || err.message);
                  setPaymentResult({ success: false, message: errorMsg });
                  toast.error(errorMsg);
                }
              }} className="payment-form">
                <label>Nom sur la carte<input name="cardName" required /></label>
                <label>Numéro de carte<input name="cardNumber" inputMode="numeric" pattern="[0-9 ]{13,19}" placeholder="4242 4242 4242 4242" required /></label>
                <div className="row">
                  <label>Expiration<input name="expiry" placeholder="MM/AA" required /></label>
                  <label>CVC<input name="cvc" inputMode="numeric" required /></label>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn">Payer</button>
                  <button type="button" className="btn ghost" onClick={() => setCheckout(null)}>Annuler</button>
                </div>
              </form>
              {paymentResult && <div className={`payment-result ${paymentResult.success ? 'success' : 'error'}`}>{paymentResult.message}</div>}
            </div>
          </div>
        )}
      </main>

      {/* Product view modal */}
      {productModal && (
        <div className="sd-modal" role="dialog" aria-modal>
          <div className="sd-modal-backdrop" onClick={() => setProductModal(null)} />
          <div className="sd-modal-panel">
            <h3>{productModal.name}</h3>
            <p>{productModal.desc}</p>
            <div>Prix: {productModal.price} DA</div>
            <div>Stock: {productModal.stock ?? '—'}</div>
            <div style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => { addToCart(productModal); setProductModal(null); }}>Ajouter au panier</button>
              <button className="btn ghost" onClick={() => setProductModal(null)} style={{ marginLeft: 8 }}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Secure Chat Modal */}
      {secureChatOpen && chatProduct && (() => {
        // Décoder le JWT pour obtenir l'ID utilisateur
        const token = localStorage.getItem('authToken') || '';
        const userEmail = localStorage.getItem('userEmail') || 'buyer@example.com';
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
              name: userName || 'Acheteur',
              role: 'buyer'
            }}
            otherUser={{
              id: chatProduct.sellerId || chatProduct.seller,
              email: chatProduct.sellerId || chatProduct.seller,
              name: chatProduct.sellerName || chatProduct.seller,
              role: 'seller'
            }}
            productId={chatProduct.id.toString()}
            token={token}
            onClose={() => {
              setSecureChatOpen(false);
              setChatProduct(null);
            }}
          />
        );
      })()}
    </div>
  );
};

export default BuyerDashboard;
