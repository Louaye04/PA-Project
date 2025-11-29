import React, { useEffect, useState } from 'react';
import './SellerDashboard.scss';
import Logo from '../Logo/Logo';

const SellerDashboard = ({ userName }) => {
  // Products and orders stored in local state (and persisted to localStorage)
  const [products, setProducts] = useState(() => {
    try {
      const raw = localStorage.getItem('sellerProducts');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { id: 1, name: 'Chaussures de sport', price: 5000, stock: 23, desc: 'Chaussures confortables pour le sport.' },
      { id: 2, name: 'T-shirt BKH', price: 1500, stock: 50, desc: 'T-shirt en coton premium.' },
      { id: 3, name: 'Sac à dos', price: 6000, stock: 12, desc: 'Sac à dos robuste pour usage quotidien.' }
    ];
  });

  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem('sellerOrders');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [
      { id: 101, name: 'Chaussures de sport', price: 5000, status: 'En attente', customer: 'Kahla Hind' },
      { id: 102, name: 'Sac à dos', price: 6000, status: 'Livrée', customer: 'Amine B.' },
      { id: 103, name: 'T-shirt BKH', price: 1500, status: 'En cours', customer: 'Sara B.' }
    ];
  });

  const [modal, setModal] = useState({ open: false, mode: null, product: null });
  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState('Toutes');

  useEffect(() => {
    // Save current body background styles to restore later
    const prevBackground = document.body.style.background;
    const prevBackgroundSize = document.body.style.backgroundSize;
    const prevBackgroundPosition = document.body.style.backgroundPosition;
    const prevBackgroundAttachment = document.body.style.backgroundAttachment;
    const prevBackgroundRepeat = document.body.style.backgroundRepeat;
    // Save current .app background to restore later
    const appEl = document.querySelector('.app');
    const prevAppBackground = appEl ? appEl.style.background : null;

    // Apply ecommerce background to whole page
    document.body.style.background = "url('/interface-ecommerce.png') no-repeat center center fixed";
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
    // Make the main app container transparent so the body background shows through
    if (appEl) {
      appEl.style.background = 'transparent';
    }

    // persist products/orders when component unmounts
    return () => {
      try { localStorage.setItem('sellerProducts', JSON.stringify(products)); } catch (e) {}
      try { localStorage.setItem('sellerOrders', JSON.stringify(orders)); } catch (e) {}
      // Restore previous body background
      document.body.style.background = prevBackground || '';
      document.body.style.backgroundSize = prevBackgroundSize || '';
      document.body.style.backgroundPosition = prevBackgroundPosition || '';
      document.body.style.backgroundAttachment = prevBackgroundAttachment || '';
      document.body.style.backgroundRepeat = prevBackgroundRepeat || '';
      // Restore .app background
      if (appEl) {
        appEl.style.background = prevAppBackground || '';
      }
    };
  }, []);

  // Persist to localStorage when products or orders change
  useEffect(() => {
    try { localStorage.setItem('sellerProducts', JSON.stringify(products)); } catch (e) {}
  }, [products]);
  useEffect(() => {
    try { localStorage.setItem('sellerOrders', JSON.stringify(orders)); } catch (e) {}
  }, [orders]);

  const bgStyle = { background: 'transparent' };

  // handlers
  const openAddModal = () => setModal({ open: true, mode: 'add', product: { name: '', price: '', stock: '', desc: '' } });
  const openEditModal = (p) => setModal({ open: true, mode: 'edit', product: { ...p } });
  const openViewModal = (p) => setModal({ open: true, mode: 'view', product: { ...p } });
  const closeModal = () => setModal({ open: false, mode: null, product: null });

  const saveProduct = (prod) => {
    if (modal.mode === 'add') {
      const nextId = products.length ? Math.max(...products.map(x => x.id)) + 1 : 1;
      setProducts(prev => [...prev, { ...prod, id: nextId }]);
    } else if (modal.mode === 'edit') {
      setProducts(prev => prev.map(p => p.id === prod.id ? prod : p));
    }
    closeModal();
  };

  const toggleOrdersPanel = () => setOrdersPanelOpen(v => !v);
  const updateOrderStatus = (orderId, status) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  return (
    <div className="seller-dashboard" style={bgStyle}>
      <div className="seller-content">
      <header className="seller-header">
        <div className="header-left">
          <div className="app-header-logo"><Logo size={48} /></div>
          <h2>Tableau de bord vendeur</h2>
        </div>
        <div className="seller-actions">
          <button className="btn" onClick={openAddModal}>Ajouter un produit</button>
          <button className="btn" onClick={toggleOrdersPanel}>{ordersPanelOpen ? 'Fermer commandes' : 'Voir commandes'}</button>
          <button className="logout-btn" onClick={() => { localStorage.removeItem('authToken'); localStorage.removeItem('userEmail'); localStorage.removeItem('userName'); window.location.reload(); }}>Se déconnecter</button>
        </div>
      </header>
      <section className="seller-welcome">
        <h1>Bonjour {userName}</h1>
        <p className="subtitle">Gérez vos produits et suivez vos performances en toute simplicité.</p>
      </section>

      <section className="seller-metrics">
        <div className="metric card">
          <h3>Ventes aujourd'hui</h3>
        {/* Modal for add/edit/view */}
        {modal.open && (
          <div className="sd-modal" role="dialog" aria-modal="true">
            <div className="sd-modal-backdrop" onClick={closeModal} />
            <div className="sd-modal-panel">
              {modal.mode === 'view' ? (
                <div>
                  <h3>{modal.product.name}</h3>
                  <p><strong>Prix:</strong> {modal.product.price} DA</p>
                  <p><strong>Stock:</strong> {modal.product.stock}</p>
                  <p>{modal.product.desc}</p>
                  <div className="modal-actions"><button onClick={closeModal} className="btn">Fermer</button></div>
                </div>
              ) : (
                <ProductForm product={modal.product} onSave={saveProduct} onCancel={closeModal} />
              )}
            </div>
          </div>
        )}
          <p className="value">24</p>
        </div>
        <div className="metric card">
          <h3>Produits</h3>
          <p className="value">12</p>
        </div>
        <div className="metric card">
          <h3>Commandes en attente</h3>
          <p className="value">3</p>
        </div>
      </section>

      <section className="seller-products">
        <h3>Vos produits</h3>
        <div className="products-grid">
          {products.map(p => (
            <div className="product-row" key={p.id}>
              <div className="product-info">
                <strong>{p.name}</strong>
                <div className="muted">{p.price} DA — Stock: {p.stock}</div>
                <div className="product-desc">{p.desc}</div>
              </div>
              <div className="product-actions">
                <button className="action edit" onClick={() => openEditModal(p)}>Modification</button>
                <button className="action view" onClick={() => openViewModal(p)}>Voir</button>
                <button
                  className="action delete"
                  onClick={() => {
                    const ok = window.confirm(`Supprimer le produit « ${p.name} » ?`);
                    if (!ok) return;
                    setProducts(prev => prev.filter(x => x.id !== p.id));
                  }}
                >Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Orders panel */}
      {ordersPanelOpen && (
        <section className="seller-orders">
          <h3>Commandes</h3>
          <div className="orders-filters">
            {['Toutes', 'En attente', 'En cours', 'Livrée', 'Terminé'].map(f => (
              <button key={f} className="filter-btn" onClick={() => setOrdersFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="orders-list">
            {orders
              .filter(o => ordersFilter === 'Toutes' ? true : o.status === ordersFilter)
              .map(o => (
              <div className="order-row" key={o.id}>
                <div>
                  <div className="order-name">{o.name} — {o.price} DA</div>
                  <div className="order-meta">Client: {o.customer} — Statut: {o.status}</div>
                </div>
                <div className="order-actions">
                  <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                    <option>En attente</option>
                    <option>En cours</option>
                    <option>Livrée</option>
                    <option>Terminé</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
};

export default SellerDashboard;

// Small form component used for add/edit product inside the modal
function ProductForm({ product: initial, onSave, onCancel }) {
  const [p, setP] = useState({ ...initial });
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
        <input name="price" type="number" value={p.price} onChange={handleChange} required />
      </label>
      <label>Stock
        <input name="stock" type="number" value={p.stock} onChange={handleChange} required />
      </label>
      <label>Description
        <textarea name="desc" value={p.desc} onChange={handleChange} />
      </label>
      <div className="modal-actions">
        <button type="submit" className="btn">Enregistrer</button>
        <button type="button" className="btn" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
