import React, { useEffect, useState } from 'react';
import './SellerDashboard.scss';
import Logo from '../Logo/Logo';
import SecureChat from '../SecureChat/SecureChat';
import { getMyProducts, createProduct, updateProduct, deleteProduct } from '../../utils/product-api';
import { getMyOrders, updateOrderStatus } from '../../utils/order-api';

const SellerDashboard = ({ userName }) => {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [modal, setModal] = useState({ open: false, mode: null, product: null });
  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState('Toutes');
  const [secureChatOpen, setSecureChatOpen] = useState(false);
  const [chatOrder, setChatOrder] = useState(null);

  // Charger les produits et commandes au montage
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('Non authentifié');
        return;
      }

      const [productsRes, ordersRes] = await Promise.all([
        getMyProducts(token),
        getMyOrders(token)
      ]);

      setProducts(productsRes.data || []);
      setOrders(ordersRes.data || []);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setError(err.response?.data?.error || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prevBackground = document.body.style.background;
    const prevBackgroundSize = document.body.style.backgroundSize;
    const prevBackgroundPosition = document.body.style.backgroundPosition;
    const prevBackgroundAttachment = document.body.style.backgroundAttachment;
    const prevBackgroundRepeat = document.body.style.backgroundRepeat;
    const appEl = document.querySelector('.app');
    const prevAppBackground = appEl ? appEl.style.background : null;

    document.body.style.background = "url('/interface-ecommerce.png') no-repeat center center fixed";
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
    if (appEl) {
      appEl.style.background = 'transparent';
    }

    return () => {
      document.body.style.background = prevBackground || '';
      document.body.style.backgroundSize = prevBackgroundSize || '';
      document.body.style.backgroundPosition = prevBackgroundPosition || '';
      document.body.style.backgroundAttachment = prevBackgroundAttachment || '';
      document.body.style.backgroundRepeat = prevBackgroundRepeat || '';
      if (appEl) {
        appEl.style.background = prevAppBackground || '';
      }
    };
  }, []);

  const bgStyle = { background: 'transparent' };

  // handlers
  const openAddModal = () => setModal({ open: true, mode: 'add', product: { name: '', price: '', stock: '', desc: '' } });
  const openEditModal = (p) => setModal({ open: true, mode: 'edit', product: { ...p } });
  const openViewModal = (p) => setModal({ open: true, mode: 'view', product: { ...p } });
  const closeModal = () => setModal({ open: false, mode: null, product: null });

  const saveProduct = async (prod) => {
    try {
      if (modal.mode === 'add') {
        await createProduct(prod);
      } else if (modal.mode === 'edit') {
        await updateProduct(prod.id, prod);
      }
      closeModal();
      await loadData();
    } catch (err) {
      alert('Erreur lors de la sauvegarde du produit: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    const ok = window.confirm(`Supprimer le produit « ${productName} » ?`);
    if (!ok) return;
    try {
      await deleteProduct(productId);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la suppression: ' + (err.response?.data?.error || err.message));
    }
  };

  const toggleOrdersPanel = () => setOrdersPanelOpen(v => !v);
  
  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      await loadData();
    } catch (err) {
      alert('Erreur lors de la mise à jour du statut: ' + (err.response?.data?.error || err.message));
    }
  };

  if (loading) {
    return (
      <div className="seller-dashboard" style={bgStyle}>
        <div className="seller-content" style={{ textAlign: 'center', padding: '100px 20px' }}>
          <h2>Chargement...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seller-dashboard" style={bgStyle}>
        <div className="seller-content" style={{ textAlign: 'center', padding: '100px 20px' }}>
          <h2>Erreur: {error}</h2>
          <button className="btn" onClick={loadData}>Réessayer</button>
        </div>
      </div>
    );
  }

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
          {products.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
              Aucun produit pour le moment. Cliquez sur "Ajouter un produit" pour commencer.
            </div>
          ) : (
            products.map(p => (
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
                    onClick={() => handleDeleteProduct(p.id, p.name)}
                  >Supprimer</button>
                </div>
              </div>
            ))
          )}
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
            {orders.length === 0 ? (
              <div>Aucune commande pour le moment.</div>
            ) : (
              orders
                .filter(o => ordersFilter === 'Toutes' ? true : o.status === ordersFilter)
                .map(o => (
                <div className="order-row" key={o.id}>
                  <div>
                    <div className="order-name">{o.productName} x{o.quantity} — {o.totalPrice} DA</div>
                    <div className="order-meta">Client: {o.buyerName} — Statut: {o.status}</div>
                  </div>
                  <div className="order-actions">
                    <button 
                      className="action secure-chat-btn" 
                      onClick={() => {
                        setChatOrder(o);
                        setSecureChatOpen(true);
                      }}
                    >
                      🔐 Chat Sécurisé
                    </button>
                    <select value={o.status} onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}>
                      <option>En attente</option>
                      <option>En cours</option>
                      <option>Livrée</option>
                      <option>Terminé</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Secure Chat Modal */}
      {secureChatOpen && chatOrder && (
        <SecureChat
          currentUser={{
            id: localStorage.getItem('userEmail') || 'seller@example.com',
            email: localStorage.getItem('userEmail') || 'seller@example.com',
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
          token={localStorage.getItem('authToken') || ''}
          onClose={() => {
            setSecureChatOpen(false);
            setChatOrder(null);
          }}
        />
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
        <input name="price" type="number" inputMode="decimal" step="0.01" min="0" pattern="[0-9]+([\.][0-9]+)?" value={p.price} onChange={handleChange} onBlur={(e)=>{ if(e.target.value==='') setP(prev=>({...prev, price:0})); }} required />
      </label>
      <label>Stock
        <input name="stock" type="number" inputMode="numeric" step="1" min="0" pattern="[0-9]*" value={p.stock} onChange={handleChange} onBlur={(e)=>{ if(e.target.value==='' || isNaN(Number(e.target.value))) setP(prev=>({...prev, stock:0})); }} required />
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
