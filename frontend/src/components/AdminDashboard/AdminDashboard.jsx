import React, { useState, useEffect } from 'react';
import './AdminDashboard.scss';
import Logo from '../Logo/Logo';

const AdminDashboard = ({ userName }) => {
  const [tab, setTab] = useState('dashboard');

  // derive a friendly first name from the provided userName or stored token/email
  const getFirstName = (raw) => {
    if (!raw) return '';
    // if looks like an email, use part before @
    let name = raw;
    if (raw.includes('@')) name = raw.split('@')[0];
    // replace separators with space and take first token
    name = name.replace(/[._\-+]/g, ' ').trim();
    const first = name.split(' ')[0] || name;
    // capitalize first letter
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  };

  // try to get a fallback from localStorage if userName not passed
  const storedName = userName || (() => {
    try {
      // some flows store user email/name in localStorage under 'userEmail' or 'userName'
      const u = localStorage.getItem('userEmail') || localStorage.getItem('userName');
      return u || '';
    } catch (e) {
      return '';
    }
  })();

  const firstName = getFirstName(storedName);

  // static sample data for orders and clients (demo)
  const recentOrders = [
    { name: 'Réfrigérateur Star', price: '78 000 DA', payment: 'Livrée', status: 'Livrée' },
    { name: 'Ordinateur Dell', price: '18 000 DA', payment: 'Dû', status: 'En attente' },
    { name: 'Montre Apple', price: '15 000 DA', payment: 'Payé', status: 'Terminé' },
    { name: 'Chaussures Adidas', price: '78 000 DA', payment: 'Dû', status: 'En cours' },
    { name: 'Sac à dos', price: '6 000 DA', payment: 'Livrée', status: 'Livrée' }
  ];

  const recentClients = [
    { name: 'David Amit' },
    { name: 'Sara Ben' },
    { name: 'Kamel O.' },
    { name: 'Lina R.' }
  ];

  useEffect(() => {
    // Ensure admin view uses a full-page neutral background and clears any previous image/background
    const prevBodyBg = document.body.style.background;
    const prevDocBg = document.documentElement.style.background;

    // Apply a neutral light background to entire page (covers edges)
    document.body.style.background = 'var(--bg-100)';
    document.documentElement.style.background = 'var(--bg-100)';

    // mark global elements so admin-specific CSS can override app-level backgrounds
    const html = document.documentElement;
    const root = document.getElementById('root');
    html.classList.add('admin-active');
    document.body.classList.add('admin-active');
    if (root) root.classList.add('admin-active');
    const appEl = document.querySelector('.app');
    if (appEl) appEl.classList.add('admin-active');

    return () => {
      // restore previous backgrounds when leaving admin
      document.body.style.background = prevBodyBg || '';
      document.documentElement.style.background = prevDocBg || '';

      html.classList.remove('admin-active');
      document.body.classList.remove('admin-active');
      if (root) root.classList.remove('admin-active');
      if (appEl) appEl.classList.remove('admin-active');
    };
  }, []);

  const [collapsed, setCollapsed] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    // reload to show login screen
    window.location.reload();
  };

  const handleToggle = () => setCollapsed(c => !c);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    // For demo: show a success message and keep user on page
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3500);
  };

  return (
    <div className="admin-dashboard-root">
      <aside className={`admin-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="brand">
          <Logo size={44} />
        </div>
        <nav className="nav-list">
          <button className={`nav-item ${tab === 'dashboard' ? 'active' : ''}`} onClick={() => setTab('dashboard')}>
            <span className="icon" aria-hidden>📊</span>
            <span className="label">Tableau de bord</span>
          </button>
          <button className={`nav-item ${tab === 'clients' ? 'active' : ''}`} onClick={() => setTab('clients')}>
            <span className="icon" aria-hidden>👥</span>
            <span className="label">Clients</span>
          </button>
          <button className={`nav-item ${tab === 'help' ? 'active' : ''}`} onClick={() => setTab('help')}>
            <span className="icon" aria-hidden>❓</span>
            <span className="label">Aide</span>
          </button>
          <button className={`nav-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
            <span className="icon" aria-hidden>⚙️</span>
            <span className="label">Paramètres</span>
          </button>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-left">
            <button className="hamburger" aria-label="Menu" onClick={handleToggle}>☰</button>
            <div className="admin-greeting">{firstName ? `Bonjour ${firstName}` : 'Bonjour'}</div>
          </div>
          <div className="topbar-right">
            <div className="metrics">
              <div className="metric">
                <div className="metric-value">1,504</div>
                <div className="metric-label">Vues quotidiennes</div>
              </div>
              <div className="metric">
                <div className="metric-value">80</div>
                <div className="metric-label">Ventes</div>
              </div>
              <div className="metric">
                <div className="metric-value">284</div>
                <div className="metric-label">Commentaires</div>
              </div>
              <div className="metric metric-revenue">
                <div className="metric-value">7,842 DA</div>
                <div className="metric-label">Revenus</div>
              </div>
            </div>
            <button className="top-logout" onClick={handleLogout}>Se déconnecter</button>
          </div>
        </header>

        <section className="admin-content">
          {tab === 'dashboard' && (
            <>
              <div className="content-left">
                <div className="card orders-card">
                  <div className="card-header">
                    <h3>Commandes récentes</h3>
                    <button className="small">Voir tout</button>
                  </div>
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Nom</th>
                        <th>Prix</th>
                        <th>Paiement</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((o, i) => (
                        <tr key={i}>
                          <td>{o.name}</td>
                          <td>{o.price}</td>
                          <td>{o.payment}</td>
                          <td><span className={`status ${o.status.replace(/\s+/g,'').toLowerCase()}`}>{o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="content-right">
                <div className="card clients-card">
                  <h4>Clients récents</h4>
                  <ul className="clients-list">
                    {recentClients.map((c, i) => (
                      <li key={i} className="client-row">
                        <div className="avatar">{c.name.split(' ')[0].charAt(0)}</div>
                        <div className="client-info">
                          <div className="client-name">{c.name}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button className="clients-cta">Clients</button>
                </div>
              </aside>
            </>
          )}

          {tab === 'clients' && (
            <div className="content-left full">
              <div className="card clients-full-card">
                <div className="card-header"><h3>Liste des clients</h3></div>
                <ul className="clients-list full-list">
                  {recentClients.map((c, i) => (
                    <li key={i} className="client-row">
                      <div className="avatar">{c.name.split(' ')[0].charAt(0)}</div>
                      <div className="client-info">
                        <div className="client-name">{c.name}</div>
                        <div className="client-email">{c.email || `${c.name.split(' ')[0].toLowerCase()}@example.com`}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {tab === 'help' && (
            <div className="content-left full">
              <div className="card help-card">
                <h3>Aide & Support</h3>
                <p>Bienvenue dans la section Aide. Voici quelques ressources utiles :</p>
                <ul>
                  <li>Documentation utilisateur</li>
                  <li>Procédure pour gérer les commandes</li>
                  <li>Contact support: support@bkh.example</li>
                </ul>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="content-left full">
              <div className="card settings-card">
                <h3>Paramètres</h3>
                <form className="settings-form" onSubmit={handleSaveSettings}>
                  <div className="form-row">
                    <label>Devise par défaut</label>
                    <select defaultValue="DA"><option>DA</option><option>EUR</option><option>USD</option></select>
                  </div>
                  <div className="form-row">
                    <label>Fuseau horaire</label>
                    <select defaultValue="Africa/Algiers"><option>Africa/Algiers</option><option>UTC</option><option>Europe/Paris</option></select>
                  </div>
                  <div className="form-row">
                    <label>Email de contact</label>
                    <input type="text" defaultValue="support@bkh.example" />
                  </div>
                  <div className="form-row">
                    <label>Activer notifications</label>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="form-actions"><button className="small" type="submit">Enregistrer</button></div>
                  {settingsSaved && (
                    <div className="save-banner success">Paramètres enregistrés avec succès.</div>
                  )}
                </form>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminDashboard;
