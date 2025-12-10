import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.scss';
import Logo from '../Logo/Logo';
import API_BASE_URL from '../../config/api';

const AdminDashboard = ({ userName }) => {
  const [tab, setTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

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

  // static sample data for orders (demo)
  const recentOrders = [
    { name: 'Réfrigérateur Star', price: '78 000 DA', payment: 'Livrée', status: 'Livrée' },
    { name: 'Ordinateur Dell', price: '18 000 DA', payment: 'Dû', status: 'En attente' },
    { name: 'Montre Apple', price: '15 000 DA', payment: 'Payé', status: 'Terminé' },
    { name: 'Chaussures Adidas', price: '78 000 DA', payment: 'Dû', status: 'En cours' },
    { name: 'Sac à dos', price: '6 000 DA', payment: 'Livrée', status: 'Livrée' }
  ];

  // Fetch users and stats from API
  useEffect(() => {
    fetchUsersData();
  }, []);

  const fetchUsersData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');

      console.log('Fetching users with token:', token ? 'Token exists' : 'No token');
      console.log('API URL:', `${API_BASE_URL}/api/users`);

      let usersRes, statsRes;

      try {
        // Try with authentication first
        [usersRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/users`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${API_BASE_URL}/api/users/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
      } catch (authError) {
        console.warn('Auth request failed, trying test endpoint:', authError.response?.status);

        // If auth fails, try test endpoint as fallback
        if (authError.response?.status === 401 || authError.response?.status === 403) {
          console.log('Trying unauthenticated test endpoint...');
          usersRes = await axios.get(`${API_BASE_URL}/api/users/test`);

          // Calculate stats from users data
          const users = usersRes.data.users || [];
          const calculatedStats = {
            total: users.length,
            buyers: 0,
            sellers: 0,
            admins: 0,
            both: 0,
            mfaEnabled: 0
          };

          users.forEach(user => {
            const userRoles = user.roles || [];
            if (userRoles.includes('admin')) calculatedStats.admins++;
            if (userRoles.includes('buyer') && userRoles.includes('seller')) {
              calculatedStats.both++;
            } else if (userRoles.includes('buyer')) {
              calculatedStats.buyers++;
            } else if (userRoles.includes('seller')) {
              calculatedStats.sellers++;
            }
            if (user.mfaEnabled) calculatedStats.mfaEnabled++;
          });

          statsRes = { data: { stats: calculatedStats } };
        } else {
          throw authError;
        }
      }

      console.log('Users response:', usersRes.data);
      console.log('Stats response:', statsRes.data);

      const fetchedUsers = usersRes.data.users || [];
      const fetchedStats = statsRes.data.stats || {};

      console.log('Setting users:', fetchedUsers.length, 'users');

      // Hide admin users from the table (do not show admin accounts)
      const visibleUsers = fetchedUsers.filter(u => {
        const roles = u.roles || (u.role ? [u.role] : []);
        return !roles.includes('admin');
      });

      console.log('Visible users after filtering admins:', visibleUsers.length);

      setUsers(visibleUsers);
      // keep original stats object for backend-aware info, but UI metrics use visible users
      setStats(fetchedStats);
    } catch (error) {
      console.error('Error fetching users:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.message);

      // Set empty arrays to show the UI even on error
      setUsers([]);
      setStats({
        total: 0,
        buyers: 0,
        sellers: 0,
        admins: 0,
        both: 0,
        mfaEnabled: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Filtering and sorting
  const getFilteredUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.birthCity?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => {
        const userRoles = user.roles || [];
        if (roleFilter === 'both') {
          return userRoles.includes('buyer') && userRoles.includes('seller');
        }
        return userRoles.includes(roleFilter);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle special cases
      if (sortConfig.key === 'roles') {
        aVal = (a.roles || []).join(',');
        bVal = (b.roles || []).join(',');
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getRoleBadges = (roles) => {
    if (!roles || roles.length === 0) return <span className="role-badge buyer">Buyer</span>;

    return roles.map((role, idx) => (
      <span key={idx} className={`role-badge ${role}`}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </span>
    ));
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    // Ensure admin view uses dark background
    const prevBodyBg = document.body.style.background;
    const prevDocBg = document.documentElement.style.background;

    // Apply dark gradient background to entire page
    document.body.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%)';
    document.documentElement.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0d0d0d 100%)';

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

  // Debug: Log state changes
  useEffect(() => {
    console.log('=== AdminDashboard State ===');
    console.log('Users:', users.length);
    console.log('Stats:', stats);
    console.log('Loading:', loading);
    console.log('Current tab:', tab);
  }, [users, stats, loading, tab]);

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
                <div className="metric-value">{users.length}</div>
                <div className="metric-label">Visible Users</div>
              </div>
              <div className="metric">
                <div className="metric-value">{users.filter(u => (u.roles || []).includes('buyer')).length}</div>
                <div className="metric-label">Buyers</div>
              </div>
              <div className="metric">
                <div className="metric-value">{users.filter(u => (u.roles || []).includes('seller')).length}</div>
                <div className="metric-label">Sellers</div>
              </div>
              {/* Admins are hidden from the UI; no metric displayed */}
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
                          <td><span className={`status ${o.status.replace(/\s+/g, '').toLowerCase()}`}>{o.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <aside className="content-right">
                <div className="card clients-card">
                  <h4>Clients récents</h4>
                  {loading ? (
                    <div className="loading-text">Chargement...</div>
                  ) : (
                    <>
                      <ul className="clients-list">
                        {users.slice(0, 5).map((user) => (
                          <li key={user.id} className="client-row">
                            <div className="avatar">
                              {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                            </div>
                            <div className="client-info">
                              <div className="client-name">{user.name || user.email.split('@')[0]}</div>
                              <div className="client-roles">{getRoleBadges(user.roles)}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button className="clients-cta" onClick={() => setTab('clients')}>Voir tous les clients</button>
                    </>
                  )}
                </div>
              </aside>
            </>
          )}

          {tab === 'clients' && (
            <div className="content-left full">
              <div className="card clients-full-card">
                <div className="card-header">
                  <h3>Gestion des Clients</h3>
                  <button className="small" onClick={fetchUsersData}>🔄 Actualiser</button>
                </div>

                {/* Filters and Search */}
                <div className="table-controls">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="🔍 Rechercher par nom, email ou ville..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="filter-buttons">
                    <button
                      className={`filter-btn ${roleFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setRoleFilter('all')}
                    >
                      Tous ({users.length})
                    </button>
                    <button
                      className={`filter-btn ${roleFilter === 'buyer' ? 'active' : ''}`}
                      onClick={() => setRoleFilter('buyer')}
                    >
                      Acheteurs ({stats?.buyers || 0})
                    </button>
                    <button
                      className={`filter-btn ${roleFilter === 'seller' ? 'active' : ''}`}
                      onClick={() => setRoleFilter('seller')}
                    >
                      Vendeurs ({stats?.sellers || 0})
                    </button>
                    <button
                      className={`filter-btn ${roleFilter === 'both' ? 'active' : ''}`}
                      onClick={() => setRoleFilter('both')}
                    >
                      Les deux ({stats?.both || 0})
                    </button>
                    {/* Admin filter removed - admins are hidden from the clients table */}
                  </div>
                </div>

                {/* Users Table */}
                {loading ? (
                  <div className="loading-text">Chargement des données...</div>
                ) : users.length === 0 ? (
                  <div className="no-results">
                    <p>Aucune donnée disponible. Vérifiez que :</p>
                    <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '10px' }}>
                      <li>Le backend est démarré</li>
                      <li>Vous êtes connecté en tant qu'admin</li>
                      <li>Le fichier users.json contient des données</li>
                    </ul>
                    <button className="small" onClick={fetchUsersData} style={{ marginTop: '20px' }}>
                      🔄 Réessayer
                    </button>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th onClick={() => handleSort('id')} className="sortable">
                            ID {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                          </th>
                          <th onClick={() => handleSort('name')} className="sortable">
                            Nom {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                          </th>
                          <th onClick={() => handleSort('email')} className="sortable">
                            Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                          </th>
                          <th>Rôles</th>
                          <th onClick={() => handleSort('birthCity')} className="sortable">
                            Ville {sortConfig.key === 'birthCity' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                          </th>
                          <th onClick={() => handleSort('createdAt')} className="sortable">
                            Inscrit le {sortConfig.key === 'createdAt' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredUsers().map((user) => (
                          <tr key={user.id}>
                            <td className="id-col">#{user.id}</td>
                            <td className="name-col">
                              <div className="user-cell">
                                <div className="avatar-small">
                                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                </div>
                                <span>{user.name || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="email-col">{user.email}</td>
                            <td className="roles-col">
                              {getRoleBadges(user.roles)}
                            </td>
                            <td className="city-col">{user.birthCity || 'N/A'}</td>
                            {/* MFA column removed per request */}
                            <td className="date-col">{formatDate(user.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {getFilteredUsers().length === 0 && users.length > 0 && (
                      <div className="no-results">
                        Aucun client trouvé avec les critères de recherche.
                      </div>
                    )}
                  </div>
                )}
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
