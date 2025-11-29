import React, { useEffect, useState } from 'react';
import './BuyerDashboard.scss';
import Logo from '../Logo/Logo';

const sampleProducts = [
  { id: 1, name: 'Chaussures de sport', price: 5000, seller: 'Kahla Hind', stock: 23, desc: 'Chaussures confortables, semelle amortissante.' },
  { id: 2, name: 'Sac à dos urbain', price: 6000, seller: 'Amine Shop', stock: 12, desc: 'Compartiments multiples, imperméable.' },
  { id: 3, name: 'T-shirt BKH', price: 1500, seller: 'BKH Store', stock: 50, desc: 'Coton biologique, coupe moderne.' }
];

const BuyerDashboard = ({ userName }) => {
  const [products, setProducts] = useState(() => {
    try { const raw = localStorage.getItem('buyerProducts'); if (raw) return JSON.parse(raw); } catch (e) {}
    return sampleProducts;
  });
  const [cart, setCart] = useState(() => {
    try { const raw = localStorage.getItem('buyerCart'); if (raw) return JSON.parse(raw); } catch (e) {}
    return [];
  });
  const [query, setQuery] = useState('');
  const [currentTab, setCurrentTab] = useState('home'); // 'home','orders','favorites','help','settings'
  const [productModal, setProductModal] = useState(null); // product to view
  const [favorites, setFavorites] = useState(() => {
    try { const raw = localStorage.getItem('buyerFavorites'); if (raw) return JSON.parse(raw); } catch (e) {}
    return [];
  });
  const [orders, setOrders] = useState(() => {
    try { const raw = localStorage.getItem('buyerOrders'); if (raw) return JSON.parse(raw); } catch (e) {}
    return [
      { id: 201, date: '2025-11-12', items: [{name: 'T-shirt BKH', qty:1}], total: 1500, status: 'Livrée' },
      { id: 202, date: '2025-11-16', items: [{name: 'Chaussures de sport', qty:1}], total: 5000, status: 'En attente' }
    ];
  });
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settings, setSettings] = useState(() => ({ currency: 'DA', timezone: 'Africa/Algiers', contactEmail: 'support@bkh.example' }));
  // Logout handler for buyer
  const handleLogout = () => {
    try { localStorage.removeItem('authToken'); localStorage.removeItem('userEmail'); localStorage.removeItem('userName'); } catch (e) {}
    // reload to show login
    window.location.reload();
  };
  const [checkout, setCheckout] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const [cartVisible, setCartVisible] = useState(false);

  useEffect(() => {
    // Do not modify the document body background here — keep the app neutral and professional.
    const appEl = document.querySelector('.app');
    const prevAppBg = appEl ? appEl.style.background : '';
    if (appEl) appEl.style.background = '#f6f7fb';
    return () => {
      if (appEl) appEl.style.background = prevAppBg || '';
    };
  }, []);

  useEffect(() => { try { localStorage.setItem('buyerCart', JSON.stringify(cart)); } catch (e) {} }, [cart]);

  const addToCart = (p) => {
    setCart(prev => {
      const existing = prev.find(x => x.id === p.id);
      if (existing) return prev.map(x => x.id === p.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(x => x.id !== id));
  const updateQty = (id, qty) => setCart(prev => prev.map(x => x.id === id ? { ...x, qty } : x));

  const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.desc.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="buyer-dashboard-root">
      <aside className="buyer-sidebar">
        <div className="brand"><Logo size={44} /><div className="brand-name">BKH Shop</div></div>
        <nav className="nav-list">
          <button className={`nav-item ${currentTab==='home' ? 'active' : ''}`} onClick={() => setCurrentTab('home')}>Accueil</button>
          <button className={`nav-item ${currentTab==='orders' ? 'active' : ''}`} onClick={() => setCurrentTab('orders')}>Mes commandes</button>
          <button className={`nav-item ${currentTab==='favorites' ? 'active' : ''}`} onClick={() => setCurrentTab('favorites')}>Favoris</button>
          <button className={`nav-item ${currentTab==='help' ? 'active' : ''}`} onClick={() => setCurrentTab('help')}>Aide</button>
          <button className={`nav-item ${currentTab==='settings' ? 'active' : ''}`} onClick={() => setCurrentTab('settings')}>Paramètres</button>
        </nav>
      </aside>

      <main className="buyer-main">
        <header className="buyer-topbar">
          <div className="search-wrapper">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher des produits, ex: Chaussures" />
          </div>
          <div className="top-actions">
            <div className="greeting">Bonjour {userName}</div>
            <button className="cart-btn" onClick={() => setCartVisible(v => !v)} aria-expanded={cartVisible} aria-controls="cart-drawer">🛒 Panier <span className="cart-count">({cart.reduce((s,i)=>s+i.qty,0)})</span></button>
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
                {filtered.map(p => (
                  <article key={p.id} className="card">
                    <div className="card-header">
                      <div className="card-title">{p.name}</div>
                      <div className="card-seller">{p.seller}</div>
                    </div>
                    <div className="card-body">
                      <p className="desc">{p.desc}</p>
                    </div>
                    <div className="card-footer">
                      <div className="price">{p.price} DA</div>
                      <div className="actions">
                        <button className="btn" onClick={() => addToCart(p)}>Ajouter au panier</button>
                        <button className="btn ghost" onClick={() => setProductModal(p)}>Voir</button>
                        <button className="btn" onClick={() => {
                          setFavorites(prev => {
                            if (prev.find(x => x.id === p.id)) return prev;
                            const next = [...prev, p];
                            try { localStorage.setItem('buyerFavorites', JSON.stringify(next)); } catch (e) {}
                            return next;
                          });
                        }}>{favorites.find(x=>x.id===p.id) ? 'Favori' : 'Ajouter aux favoris'}</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {currentTab === 'orders' && (
          <section className="orders-view">
            <h2>Mes commandes</h2>
            <div className="orders-list">
              {orders.map(o => (
                <div className="order-card" key={o.id}>
                  <div className="order-header">Commande #{o.id} — {o.date}</div>
                  <div className="order-body">
                    <div>Articles: {o.items.map(i=>`${i.name} x${i.qty}`).join(', ')}</div>
                    <div>Total: {o.total} DA</div>
                    <div>Statut: <strong>{o.status}</strong></div>
                  </div>
                  <div className="order-actions">
                    <select value={o.status} onChange={(e)=>{
                      const s = e.target.value; setOrders(prev => prev.map(x=> x.id===o.id?({...x,status:s}):x));
                      try { localStorage.setItem('buyerOrders', JSON.stringify(orders)); } catch(e){}
                    }}>
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

        {currentTab === 'favorites' && (
          <section className="favorites-view">
            <h2>Favoris</h2>
            {favorites.length === 0 ? <div>Aucun favori pour le moment.</div> : (
              <div className="grid">
                {favorites.map(f => (
                  <article className="card" key={f.id}>
                    <div className="card-header"><div className="card-title">{f.name}</div><div className="card-seller">{f.seller}</div></div>
                    <div className="card-body"><p className="desc">{f.desc}</p></div>
                    <div className="card-footer">
                      <div className="price">{f.price} DA</div>
                      <div className="actions"><button className="btn" onClick={()=>setProductModal(f)}>Voir</button>
                        <button className="btn ghost" onClick={() => { const next = favorites.filter(x=>x.id!==f.id); setFavorites(next); try{localStorage.setItem('buyerFavorites', JSON.stringify(next));}catch(e){} }}>Supprimer</button></div>
                    </div>
                  </article>
                ))}
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
            <form className="settings-form" onSubmit={(e)=>{ e.preventDefault(); setSettingsSaved(true); try{localStorage.setItem('buyerSettings', JSON.stringify(settings)); }catch(e){}; setTimeout(()=>setSettingsSaved(false),3000); }}>
              <div className="form-row"><label>Devise par défaut<select value={settings.currency} onChange={(e)=>setSettings({...settings,currency:e.target.value})}><option>DA</option><option>EUR</option><option>USD</option></select></label></div>
              <div className="form-row"><label>Fuseau horaire<select value={settings.timezone} onChange={(e)=>setSettings({...settings,timezone:e.target.value})}><option>Africa/Algiers</option><option>UTC</option><option>Europe/Paris</option></select></label></div>
              <div className="form-row"><label>Email de contact<input value={settings.contactEmail} onChange={(e)=>setSettings({...settings,contactEmail:e.target.value})} /></label></div>
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
                        <button className="qty-btn" onClick={() => updateQty(i.id, Math.max(1, i.qty-1))}>-</button>
                        <span className="qty-value">{i.qty}</span>
                        <button className="qty-btn" onClick={() => updateQty(i.id, i.qty+1)}>+</button>
                      </div>
                      <div className="cart-price">{i.price * i.qty} DA</div>
                      <button className="remove" onClick={() => removeFromCart(i.id)}>Supprimer</button>
                    </div>
                  ))}
                  <div className="cart-total">Total : {cart.reduce((s,i)=>s+i.price*i.qty,0)} DA</div>
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
              <p>Montant à régler: <strong>{cart.reduce((s,i)=>s+i.price*i.qty,0)} DA</strong></p>
              <form onSubmit={(e) => { e.preventDefault();
                  setPaymentResult({ success: null, message: 'Traitement en cours...' });
                  setTimeout(() => {
                    setPaymentResult({ success: true, message: 'Paiement accepté — Merci pour votre commande.' });
                    setCart([]);
                    setCheckout(null);
                  }, 1200);
                }} className="payment-form">
                <label>Nom sur la carte<input name="cardName" required/></label>
                <label>Numéro de carte<input name="cardNumber" inputMode="numeric" pattern="[0-9 ]{13,19}" placeholder="4242 4242 4242 4242" required/></label>
                <div className="row">
                  <label>Expiration<input name="expiry" placeholder="MM/AA" required/></label>
                  <label>CVC<input name="cvc" inputMode="numeric" required/></label>
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
          <div className="sd-modal-backdrop" onClick={()=>setProductModal(null)} />
          <div className="sd-modal-panel">
            <h3>{productModal.name}</h3>
            <p>{productModal.desc}</p>
            <div>Prix: {productModal.price} DA</div>
            <div>Stock: {productModal.stock ?? '—'}</div>
            <div style={{marginTop:12}}>
              <button className="btn" onClick={()=>{ addToCart(productModal); setProductModal(null); }}>Ajouter au panier</button>
              <button className="btn ghost" onClick={()=>setProductModal(null)} style={{marginLeft:8}}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerDashboard;
