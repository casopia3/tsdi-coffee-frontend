import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const api = axios.create({ baseURL: API_BASE });

const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.2);
    });
  } catch (e) {}
};

const sendBrowserNotification = (orderCount) => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('☕ ትዕዛዝ ደርሷል!', {
      body: `${orderCount} አዲስ ትዕዛዝ በጠበቃ ላይ ነው`,
      icon: '/favicon.ico',
    });
  }
};

const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};

api.interceptors.request.use((config) => {
  if (config.method === 'get') {
    config.params = { ...config.params, _t: Date.now() };
  }
  return config;
});

const CLOUDINARY_CLOUD = process.env.REACT_APP_CLOUDINARY_CLOUD || 'dr7hrzwpp';
const CLOUDINARY_PRESET = process.env.REACT_APP_CLOUDINARY_PRESET || 'tsdi-coffee-uploads';

const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (data.secure_url) return data.secure_url;
  throw new Error(data.error?.message || 'Upload failed');
};

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#92400E', bg: '#FEF3C7', next: 'confirmed',  nextLabel: '✅ Confirm Payment' },
  confirmed: { label: 'Confirmed', color: '#1E40AF', bg: '#DBEAFE', next: 'preparing',  nextLabel: '👨‍🍳 Preparing' },
  preparing: { label: 'Preparing', color: '#92400E', bg: '#FEF3C7', next: 'ready',      nextLabel: '🔔 Mark Ready' },
  ready:     { label: 'Ready!',    color: '#065F46', bg: '#D1FAE5', next: 'served',     nextLabel: '✔ Served' },
  served:    { label: 'Served',    color: '#065F46', bg: '#D1FAE5', next: null,         nextLabel: null },
};

const EMOJIS = ['☕','🫖','🧊','🍵','🥭','🥑','🧃','🫓','🥚','🌯','🫘','🥐','🍞','🍩','🍰','🍕','🥗','🍜'];

const ResponsiveStyles = () => (
  <style>{`
    .dash-page { display:flex; min-height:100vh; font-family:"Inter","Segoe UI",sans-serif; background:#F7F6F3; }
    .dash-sidebar { width:250px; background:linear-gradient(180deg,#2A1408 0%,#3D1F0A 100%); display:flex; flex-direction:column; padding:24px 18px; min-height:100vh; position:sticky; top:0; box-shadow:6px 0 20px rgba(0,0,0,.15); flex-shrink:0; z-index:50; }
    .dash-main { flex:1; padding:32px; overflow:auto; background:#F7F5F2; min-width:0; }
    .dash-columns { display:grid; grid-template-columns:repeat(4,minmax(280px,1fr)); gap:24px; align-items:flex-start; }
    .dash-menu-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:22px; }
    .dash-stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
    .dash-table-wrap { width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; }
    .dash-mobile-topbar { display:none; }
    .dash-mobile-overlay { display:none; }
    @media (max-width:1024px) {
      .dash-sidebar { width:200px; padding:20px 14px; }
      .dash-main { padding:22px; }
      .dash-columns { grid-template-columns:repeat(2,minmax(240px,1fr)); }
      .dash-menu-grid { grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); }
      .dash-stats-grid { grid-template-columns:repeat(2,1fr); }
    }
    @media (max-width:768px) {
      .dash-page { flex-direction:column; }
      .dash-mobile-topbar { display:flex; align-items:center; justify-content:space-between; background:#3D1F0A; padding:14px 18px; position:sticky; top:0; z-index:60; box-shadow:0 4px 12px rgba(0,0,0,.15); }
      .dash-sidebar { position:fixed; left:-280px; top:0; height:100vh; width:240px; transition:left .25s ease; z-index:100; }
      .dash-sidebar.open { left:0; }
      .dash-mobile-overlay.open { display:block; position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:90; }
      .dash-main { padding:16px; }
      .dash-columns { grid-template-columns:1fr; gap:16px; }
      .dash-menu-grid { grid-template-columns:1fr; }
      .dash-stats-grid { grid-template-columns:repeat(2,1fr); gap:10px; }
      .dash-page-header { flex-direction:column !important; align-items:flex-start !important; gap:12px; }
      .dash-page-header > div:last-child { width:100%; display:flex; gap:8px; }
      .dash-modal-card { width:92vw !important; padding:20px !important; }
    }
    @media (max-width:420px) {
      .dash-stats-grid { grid-template-columns:1fr; }
      .dash-page-title { font-size:22px !important; }
    }
  `}</style>
);

// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [password, setPassword]     = useState('');
  const [role, setRole]             = useState(null);
  const [authError, setAuthError]   = useState('');
  const [loggingIn, setLoggingIn]   = useState(false);
  const [activeTab, setActiveTab]   = useState('orders');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Restore session ────────────────────────────────────────────────────────
  useEffect(() => {
    const savedRole = sessionStorage.getItem('dashboard_role');
    if (savedRole) setRole(savedRole);
  }, []);

  // ── Login: call backend → /api/auth/login ─────────────────────────────────
  const handleLogin = async () => {
    if (!password) return;
    setLoggingIn(true);
    setAuthError('');
    try {
      const res = await axios.post(`${API_BASE}/auth/login`, { password });
      const { role: r } = res.data.data;
      sessionStorage.setItem('dashboard_role', r);
      sessionStorage.setItem('dashboard_pw', password);
      setRole(r);
    } catch (err) {
      setAuthError(err.response?.data?.message || 'Wrong password. Try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dashboard_role');
    sessionStorage.removeItem('dashboard_pw');
    setRole(null);
    setPassword('');
    setActiveTab('orders');
  };

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!role) {
    return (
      <>
        <ResponsiveStyles />
        <div style={S.loginWrap}>
          <div style={S.loginCard}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>☕</div>
            <div style={S.loginTitle}>Tsdi Coffee</div>
            <div style={S.loginSub}>Staff Dashboard</div>
            <input
              style={S.input}
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              disabled={loggingIn}
            />
            {authError && <div style={S.authError}>{authError}</div>}
            <button style={{ ...S.loginBtn, opacity: loggingIn ? 0.7 : 1 }} onClick={handleLogin} disabled={loggingIn}>
              {loggingIn ? 'Signing in...' : 'Sign In'}
            </button>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 16 }}>
              Kitchen staff use kitchen password · Managers use admin password
            </div>
          </div>
        </div>
      </>
    );
  }

  const tabs = role === 'admin'
    ? [
        { id: 'orders',   label: '📋 Orders'   },
        { id: 'menu',     label: '🍽️ Menu'     },
        { id: 'history',  label: '📊 Revenue'   },
        { id: 'settings', label: '⚙️ Settings'  },
      ]
    : [
        { id: 'orders',   label: '📋 Orders'   },
        { id: 'settings', label: '⚙️ Settings'  },
      ];

  const goToTab = (id) => { setActiveTab(id); setSidebarOpen(false); };

  return (
    <>
      <ResponsiveStyles />
      <div className="dash-page">

        {/* Mobile top bar */}
        <div className="dash-mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: 'none', color: '#F5ECD7', fontSize: 24, cursor: 'pointer', padding: 4 }}
            aria-label="Open menu"
          >☰</button>
          <div style={{ color: '#F5ECD7', fontWeight: 700, fontSize: 16 }}>
            ☕ Tsdi Coffee — {role === 'admin' ? 'Admin' : 'Kitchen'}
          </div>
          <div style={{ width: 32 }} />
        </div>

        {/* Mobile overlay */}
        <div className={`dash-mobile-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

        {/* Sidebar */}
        <div className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div style={S.sidebarLogo}>
            <div style={{ fontSize: 28 }}>☕</div>
            <div>
              <div style={S.sidebarName}>Tsdi Coffee</div>
              <div style={S.sidebarRole}>{role === 'admin' ? '👑 Admin' : '👨‍🍳 Kitchen'}</div>
            </div>
          </div>
          <nav style={S.nav}>
            {tabs.map(t => (
              <button
                key={t.id}
                style={{ ...S.navBtn, ...(activeTab === t.id ? S.navBtnActive : {}) }}
                onClick={() => goToTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <button style={S.logoutBtn} onClick={handleLogout}>🚪 Sign Out</button>
        </div>

        {/* Main content */}
        <div className="dash-main">
          {activeTab === 'orders'   && <OrdersView role={role} />}
          {activeTab === 'menu'     && role === 'admin' && <MenuView />}
          {activeTab === 'history'  && role === 'admin' && <RevenueView />}
          {activeTab === 'settings' && <SettingsView role={role} />}
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS VIEW — change password
// ══════════════════════════════════════════════════════════════════════════════
function SettingsView({ role }) {
  const [targetRole, setTargetRole]   = useState(role); // which password to change
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');
  const [saving, setSaving]           = useState(false);
  const [success, setSuccess]         = useState('');
  const [error, setError]             = useState('');

  const handleChange = async () => {
    setError(''); setSuccess('');
    if (!currentPw || !newPw || !confirmPw) return setError('All fields are required.');
    if (newPw !== confirmPw) return setError('New passwords do not match.');
    if (newPw.length < 6) return setError('New password must be at least 6 characters.');
    if (newPw === currentPw) return setError('New password must be different from current password.');

    setSaving(true);
    try {
      await axios.patch(
        `${API_BASE}/auth/change-password`,
        { targetRole, newPassword: newPw },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('dashboard_pw')}` } }
      );

      // If changed own password, update sessionStorage so future requests still work
      if (targetRole === role) {
        sessionStorage.setItem('dashboard_pw', newPw);
      }

      setSuccess(`✅ ${targetRole === 'admin' ? 'Admin' : 'Kitchen'} password changed successfully!`);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="dash-page-header" style={S.pageHeader}>
        <div>
          <div className="dash-page-title" style={S.pageTitle}>Settings</div>
          <div style={S.pageSub}>Manage dashboard passwords</div>
        </div>
      </div>

      <div style={{ maxWidth: 480 }}>

        {/* Which password to change — admin can choose both */}
        {role === 'admin' && (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#3D1F0A', marginBottom: 14 }}>
              Which password to change?
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {['admin','kitchen'].map(r => (
                <button
                  key={r}
                  onClick={() => { setTargetRole(r); setError(''); setSuccess(''); }}
                  style={{
                    flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                    border: targetRole === r ? '2px solid #3D1F0A' : '2px solid #E5E7EB',
                    background: targetRole === r ? '#3D1F0A' : '#fff',
                    color: targetRole === r ? '#fff' : '#374151',
                  }}
                >
                  {r === 'admin' ? '👑 Admin' : '👨‍🍳 Kitchen'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Change password form */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#3D1F0A', marginBottom: 20 }}>
            Change {targetRole === 'admin' ? 'Admin' : 'Kitchen'} Password
          </div>

          <label style={S.label}>Current Password</label>
          <input
            style={S.input}
            type="password"
            placeholder="Enter current password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
          />

          <label style={S.label}>New Password</label>
          <input
            style={S.input}
            type="password"
            placeholder="At least 6 characters"
            value={newPw}
            onChange={e => setNewPw(e.target.value)}
          />

          <label style={S.label}>Confirm New Password</label>
          <input
            style={S.input}
            type="password"
            placeholder="Repeat new password"
            value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChange()}
          />

          {error   && <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{error}</div>}
          {success && <div style={{ background: '#D1FAE5', color: '#065F46', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{success}</div>}

          <button
            style={{ ...S.loginBtn, opacity: saving ? 0.7 : 1 }}
            onClick={handleChange}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Change Password'}
          </button>

          <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 14, lineHeight: 1.6 }}>
            After changing your own password you will stay logged in automatically.
            Other staff will need to use the new password on next login.
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS VIEW
// ══════════════════════════════════════════════════════════════════════════════
function OrdersView({ role }) {
  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [updating, setUpdating]           = useState(null);
  const [lastRefresh, setLastRefresh]     = useState(new Date());
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const prevPendingCount                  = useRef(0);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('dashboard_pw')}` },
      });
      const newOrders = res.data.data;
      const newPendingCount = newOrders.filter(o => o.status === 'pending').length;
      if (newPendingCount > prevPendingCount.current && prevPendingCount.current >= 0) {
        playNotificationSound();
        sendBrowserNotification(newPendingCount);
        setNewOrderAlert(true);
        setTimeout(() => setNewOrderAlert(false), 4000);
      }
      prevPendingCount.current = newPendingCount;
      setOrders(newOrders);
      setLastRefresh(new Date());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    requestNotificationPermission();
    fetchOrders();
    const iv = setInterval(fetchOrders, 8000);
    return () => clearInterval(iv);
  }, [fetchOrders]);

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('dashboard_pw')}` } }
      );
      fetchOrders();
    } catch { alert('Failed to update.'); }
    finally { setUpdating(null); }
  };

  const grouped = {
    pending:   orders.filter(o => o.status === 'pending'),
    confirmed: orders.filter(o => o.status === 'confirmed'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready:     orders.filter(o => o.status === 'ready'),
  };

  if (loading) return <div style={S.loading}>Loading orders...</div>;

  return (
    <div>
      {newOrderAlert && (
        <div style={{ background:'#3D1F0A', color:'#F5ECD7', padding:'12px 20px', fontSize:15, fontWeight:600, textAlign:'center', borderRadius:10, marginBottom:16 }}>
          🔔 አዲስ ትዕዛዝ ደርሷል! — New order arrived!
        </div>
      )}
      <div className="dash-page-header" style={S.pageHeader}>
        <div>
          <div className="dash-page-title" style={S.pageTitle}>Live Orders</div>
          <div style={S.pageSub}>{orders.length} active · refreshed {lastRefresh.toLocaleTimeString()}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button style={{ ...S.refreshBtn, background:'#C49A6C', color:'#3D1F0A', fontSize:12, flex:'0 0 auto' }} onClick={requestNotificationPermission} title="Enable notifications">🔔</button>
          <button style={{ ...S.refreshBtn, flex:'1 1 auto' }} onClick={fetchOrders}>↻ Refresh</button>
        </div>
      </div>
      {orders.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize:48, marginBottom:12 }}>🍵</div>
          <div>No active orders right now</div>
          <div style={{ fontSize:13, color:'#9CA3AF', marginTop:6 }}>Auto-refreshing every 8 seconds</div>
        </div>
      ) : (
        <div className="dash-columns">
          {['pending','confirmed','preparing','ready'].map(status => (
            <div key={status} style={S.column}>
              <div style={{ ...S.colHeader, background:STATUS_CONFIG[status].bg, color:STATUS_CONFIG[status].color }}>
                {STATUS_CONFIG[status].label}
                <span style={S.colCount}>{grouped[status].length}</span>
              </div>
              {grouped[status].length === 0
                ? <div style={S.colEmpty}>No orders</div>
                : grouped[status].map(order => (
                  <div key={order.id} style={S.orderCard}>
                    <div style={S.orderHeader}>
                      <div style={S.tableNum}>Table {order.table_number}</div>
                      <div style={S.orderTime}>{new Date(order.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                    <div style={S.orderId}>#{order.id.slice(0,8).toUpperCase()}</div>
                    <div style={S.itemsList}>
                      {order.items.map((item,i) => (
                        <div key={i} style={S.itemRow}>
                          <span style={S.itemQty}>{item.quantity}×</span>
                          <span style={S.itemName}>{item.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={S.orderTotal}>ETB {parseFloat(order.total).toFixed(0)}</div>
                    {STATUS_CONFIG[status].next && (
                      <button
                        style={{ ...S.actionBtn, opacity:updating===order.id?0.6:1 }}
                        onClick={() => updateStatus(order.id, STATUS_CONFIG[status].next)}
                        disabled={updating===order.id}
                      >
                        {updating===order.id ? 'Updating...' : STATUS_CONFIG[status].nextLabel}
                      </button>
                    )}
                  </div>
                ))
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MENU VIEW
// ══════════════════════════════════════════════════════════════════════════════
function MenuView() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ name:'', description:'', price:'', image_emoji:'☕', image_url:'', category_id:'', is_available:true });
  const [uploading, setUploading]   = useState(false);

  const pw = sessionStorage.getItem('dashboard_pw');
  const headers = { Authorization: `Bearer ${pw}` };

  const fetchMenu = useCallback(async () => {
    try { const res = await api.get('/menu'); setCategories(res.data.data); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const openAdd = (categoryId) => {
    setForm({ name:'', description:'', price:'', image_emoji:'☕', image_url:'', category_id:categoryId, is_available:true });
    setModal({ mode:'add' });
  };

  const openEdit = (item, categoryId) => {
    setForm({ name:item.name, description:item.description, price:item.price, image_emoji:item.image_emoji, image_url:item.image_url||'', category_id:categoryId, is_available:item.is_available });
    setModal({ mode:'edit', itemId:item.id });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try { const url = await uploadToCloudinary(file); setForm(f => ({ ...f, image_url:url })); }
    catch (err) { alert('Image upload failed: ' + err.message); }
    finally { setUploading(false); }
  };

  const saveItem = async () => {
    if (!form.name || !form.price) return alert('Name and price are required');
    setSaving(true);
    const payload = { name:form.name, description:form.description, price:parseFloat(form.price), image_emoji:form.image_emoji, image_url:form.image_url||null, category_id:form.category_id, is_available:form.is_available };
    try {
      if (modal.mode === 'add') { await axios.post(`${API_BASE}/menu`, payload, { headers }); }
      else { await axios.put(`${API_BASE}/menu/${modal.itemId}`, payload, { headers }); }
      setModal(null); fetchMenu();
    } catch (err) { alert(err.response?.data?.message || 'Failed to save item'); }
    finally { setSaving(false); }
  };

  const toggleAvailability = async (itemId, current) => {
    try { await axios.patch(`${API_BASE}/menu/${itemId}/availability`, { is_available:!current }, { headers }); fetchMenu(); }
    catch { alert('Failed to update'); }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    try { await axios.delete(`${API_BASE}/menu/${itemId}`, { headers }); fetchMenu(); }
    catch { alert('Failed to delete'); }
  };

  if (loading) return <div style={S.loading}>Loading menu...</div>;

  return (
    <div>
      <div className="dash-page-header" style={S.pageHeader}>
        <div>
          <div className="dash-page-title" style={S.pageTitle}>Menu Manager</div>
          <div style={S.pageSub}>Add, edit, or disable menu items</div>
        </div>
      </div>
      {categories.map(cat => (
        <div key={cat.category_id} style={S.menuSection}>
          <div style={S.menuCatHeader}>
            <span style={S.menuCatName}>{cat.category}</span>
            <button style={S.addItemBtn} onClick={() => openAdd(cat.category_id)}>+ Add Item</button>
          </div>
          <div className="dash-menu-grid">
            {cat.items.map(item => (
              <div key={item.id} style={{ ...S.menuCard, opacity:item.is_available?1:0.5 }}>
                <div style={{ height:180, overflow:'hidden', background:'#F7F5F2' }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : <div style={{ height:'100%', display:'flex', justifyContent:'center', alignItems:'center', fontSize:70 }}>{item.image_emoji}</div>
                  }
                </div>
                <div style={S.menuItemName}>{item.name}</div>
                <div style={S.menuItemDesc}>{item.description}</div>
                <div style={S.menuItemPrice}>ETB {parseFloat(item.price).toFixed(0)}</div>
                <div style={S.menuItemActions}>
                  <button style={S.editBtn} onClick={() => openEdit(item, cat.category_id)}>✏️</button>
                  <button style={{ ...S.toggleBtn, background:item.is_available?'#FEF3C7':'#D1FAE5' }} onClick={() => toggleAvailability(item.id, item.is_available)}>
                    {item.is_available ? '🔴 Disable' : '🟢 Enable'}
                  </button>
                  <button style={S.deleteBtn} onClick={() => deleteItem(item.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {modal && (
        <div style={S.modalOverlay}>
          <div className="dash-modal-card" style={S.modalCard}>
            <div style={S.modalTitle}>{modal.mode==='add'?'Add New Item':'Edit Item'}</div>
            <label style={S.label}>Name *</label>
            <input style={S.input} value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Macchiato" />
            <label style={S.label}>Description</label>
            <input style={S.input} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Short description" />
            <label style={S.label}>Price (ETB) *</label>
            <input style={S.input} type="number" value={form.price} onChange={e => setForm({...form,price:e.target.value})} placeholder="45" />
            <label style={S.label}>Emoji Icon</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:12 }}>
              {EMOJIS.map(e => (
                <button key={e} style={{ ...S.emojiBtn, background:form.image_emoji===e?'#3D1F0A':'#F3F4F6', color:form.image_emoji===e?'#fff':'#000' }} onClick={() => setForm({...form,image_emoji:e})}>{e}</button>
              ))}
            </div>
            <label style={S.label}>Item Photo</label>
            {form.image_url && (
              <div style={{ position:'relative', marginBottom:10 }}>
                <img src={form.image_url} alt="preview" style={{ width:'100%', height:140, objectFit:'cover', borderRadius:10 }} />
                <button onClick={() => setForm(f => ({...f,image_url:''}))} style={{ position:'absolute', top:8, right:8, background:'#C0392B', color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', fontWeight:600 }}>🗑 Remove Photo</button>
              </div>
            )}
            <label style={{ display:'block', padding:'10px', border:'1.5px dashed #C49A6C', borderRadius:10, textAlign:'center', cursor:'pointer', fontSize:13, color:'#6B7280', marginBottom:12, background:uploading?'#F9FAFB':'#fff' }}>
              {uploading?'⏳ Uploading...':form.image_url?'🔄 Change Photo':'📷 Upload Photo'}
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageUpload} disabled={uploading} />
            </label>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button style={{ ...S.loginBtn, flex:1 }} onClick={saveItem} disabled={saving}>{saving?'Saving...':modal.mode==='add'?'Add Item':'Save Changes'}</button>
              <button style={{ ...S.loginBtn, flex:1, background:'#6B7280' }} onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REVENUE VIEW
// ══════════════════════════════════════════════════════════════════════════════
function RevenueView() {
  const [stats, setStats]     = useState(null);
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const pw = sessionStorage.getItem('dashboard_pw');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get('/orders/history', { headers:{ Authorization:`Bearer ${pw}` } });
        const all = res.data.data;
        setOrders(all);
        const today = new Date().toDateString();
        const todayOrders = all.filter(o => new Date(o.created_at).toDateString() === today);
        setStats({
          todayRevenue: todayOrders.reduce((s,o) => s+parseFloat(o.total),0),
          todayOrders:  todayOrders.length,
          totalRevenue: all.reduce((s,o) => s+parseFloat(o.total),0),
          totalOrders:  all.length,
        });
      } catch {} finally { setLoading(false); }
    };
    fetchAll();
  }, [pw]);

  if (loading) return <div style={S.loading}>Loading revenue data...</div>;

  return (
    <div>
      <div className="dash-page-header" style={S.pageHeader}>
        <div>
          <div className="dash-page-title" style={S.pageTitle}>Revenue & Orders</div>
          <div style={S.pageSub}>Business overview</div>
        </div>
      </div>
      {stats && (
        <div className="dash-stats-grid">
          {[['Today\'s Revenue',`ETB ${stats.todayRevenue.toFixed(0)}`],['Today\'s Orders',stats.todayOrders],['Total Revenue',`ETB ${stats.totalRevenue.toFixed(0)}`],['Total Orders',stats.totalOrders]].map(([label,val]) => (
            <div key={label} style={S.statCard}>
              <div style={S.statLabel}>{label}</div>
              <div style={S.statValue}>{val}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop:24 }}>
        <div style={S.menuCatName}>Recent Orders</div>
        <div className="dash-table-wrap">
          <table style={S.table}>
            <thead>
              <tr>{['Order #','Table','Items','Total','Payment','Status','Time'].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {orders.slice(0,50).map(order => (
                <tr key={order.id} style={S.tr}>
                  <td style={S.td}>#{order.id.slice(0,8).toUpperCase()}</td>
                  <td style={S.td}>Table {order.table_number}</td>
                  <td style={S.td}>{order.items?.length||'-'} items</td>
                  <td style={S.td}>ETB {parseFloat(order.total).toFixed(0)}</td>
                  <td style={S.td}>{order.payment?.method||'cash'}</td>
                  <td style={S.td}><span style={{ ...S.badge, background:STATUS_CONFIG[order.status]?.bg||'#F3F4F6', color:STATUS_CONFIG[order.status]?.color||'#374151' }}>{order.status}</span></td>
                  <td style={S.td}>{new Date(order.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const S = {
  sidebarLogo:   { display:'flex', alignItems:'center', gap:14, marginBottom:34, paddingBottom:22, borderBottom:'1px solid rgba(255,255,255,.08)' },
  sidebarName:   { color:'#FFF8F0', fontWeight:700, fontSize:20, letterSpacing:'.3px' },
  sidebarRole:   { color:'#D8B48A', fontSize:13, marginTop:4 },
  nav:           { flex:1, display:'flex', flexDirection:'column', gap:10 },
  navBtn:        { background:'transparent', border:'none', color:'#D8B48A', padding:'13px 16px', borderRadius:12, fontSize:15, cursor:'pointer', textAlign:'left', fontWeight:600, transition:'all .25s ease' },
  navBtnActive:  { background:'#5B3316', color:'#FFF', boxShadow:'0 6px 16px rgba(0,0,0,.18)' },
  logoutBtn:     { background:'#5B3316', color:'#fff', border:'none', padding:'12px', borderRadius:12, fontSize:14, fontWeight:600, cursor:'pointer' },
  pageHeader:    { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:30, gap:12 },
  pageTitle:     { fontSize:30, fontWeight:800, color:'#2A1408' },
  pageSub:       { marginTop:6, fontSize:14, color:'#7A7A7A' },
  refreshBtn:    { background:'#3D1F0A', color:'#fff', border:'none', padding:'12px 22px', borderRadius:12, fontWeight:700, cursor:'pointer', boxShadow:'0 10px 20px rgba(61,31,10,.18)' },
  column:        { background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' },
  colHeader:     { padding:'18px 20px', fontWeight:700, fontSize:16, display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(0,0,0,.05)' },
  colCount:      { background:'rgba(255,255,255,.8)', borderRadius:'30px', padding:'6px 14px', fontWeight:700, fontSize:13 },
  colEmpty:      { padding:'20px 14px', fontSize:13, color:'#9CA3AF', textAlign:'center' },
  orderCard:     { background:'#FFFFFF', borderRadius:'18px', padding:'18px', margin:'14px', boxShadow:'0 10px 25px rgba(0,0,0,.08)', border:'1px solid #EFEFEF' },
  orderHeader:   { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 },
  tableNum:      { fontSize:20, fontWeight:800, color:'#3D1F0A' },
  orderTime:     { fontSize:12, color:'#9CA3AF', fontWeight:600 },
  orderId:       { color:'#9CA3AF', fontSize:12, margin:'8px 0 14px' },
  itemsList:     { marginBottom:8 },
  itemRow:       { display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #F5F5F5' },
  itemQty:       { width:32, height:32, borderRadius:'50%', background:'#F5ECD7', color:'#3D1F0A', display:'flex', justifyContent:'center', alignItems:'center', fontWeight:700 },
  itemName:      { flex:1, fontSize:14, color:'#374151', fontWeight:500 },
  orderTotal:    { marginTop:'16px', marginBottom:'16px', fontSize:22, fontWeight:800, color:'#3D1F0A' },
  actionBtn:     { width:'100%', padding:'14px', border:'none', borderRadius:'12px', background:'linear-gradient(135deg,#3D1F0A,#6B3A1F)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 8px 20px rgba(61,31,10,.25)' },
  loading:       { textAlign:'center', padding:60, color:'#6B7280', fontSize:15 },
  empty:         { textAlign:'center', padding:80, color:'#6B7280', fontSize:15 },
  menuSection:   { background:'#fff', borderRadius:12, padding:20, marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  menuCatHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:10 },
  menuCatName:   { fontSize:16, fontWeight:700, color:'#3D1F0A' },
  addItemBtn:    { background:'#3D1F0A', color:'#fff', border:'none', padding:'7px 14px', borderRadius:8, fontSize:13, cursor:'pointer' },
  menuCard:      { background:'#FFFFFF', border:'1px solid #ECECEC', borderRadius:'18px', overflow:'hidden', boxShadow:'0 8px 22px rgba(0,0,0,.06)', display:'flex', flexDirection:'column' },
  menuItemName:  { fontSize:18, fontWeight:700, color:'#2A1408', marginTop:14, marginBottom:6, padding:'0 16px' },
  menuItemDesc:  { fontSize:13, color:'#6B7280', lineHeight:1.6, minHeight:42, padding:'0 16px' },
  menuItemPrice: { fontSize:22, fontWeight:800, color:'#3D1F0A', padding:'12px 16px' },
  menuItemActions:{ display:'flex', gap:10, padding:'0 16px 18px', flexWrap:'wrap' },
  editBtn:       { flex:1, background:'#FFFFFF', border:'1px solid #DDD', borderRadius:10, padding:'10px', cursor:'pointer', fontWeight:600, minWidth:44 },
  toggleBtn:     { flex:2, border:'none', borderRadius:10, padding:'10px', cursor:'pointer', fontWeight:700, minWidth:90 },
  deleteBtn:     { width:46, background:'#FFE7E7', border:'none', borderRadius:10, cursor:'pointer', fontSize:18 },
  modalOverlay:  { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 },
  modalCard:     { background:'#fff', borderRadius:16, padding:28, width:420, maxHeight:'90vh', overflow:'auto', boxSizing:'border-box' },
  modalTitle:    { fontSize:18, fontWeight:700, color:'#3D1F0A', marginBottom:20 },
  label:         { display:'block', fontSize:13, fontWeight:500, color:'#374151', marginBottom:4 },
  emojiBtn:      { width:36, height:36, border:'none', borderRadius:8, cursor:'pointer', fontSize:18 },
  statCard:      { background:'#fff', borderRadius:12, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  statLabel:     { fontSize:12, color:'#6B7280', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 },
  statValue:     { fontSize:24, fontWeight:700, color:'#3D1F0A' },
  table:         { width:'100%', minWidth:640, borderCollapse:'collapse', background:'#fff', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' },
  th:            { padding:'12px 16px', fontSize:12, fontWeight:600, color:'#6B7280', textAlign:'left', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB', whiteSpace:'nowrap' },
  tr:            { borderBottom:'1px solid #F3F4F6' },
  td:            { padding:'12px 16px', fontSize:13, color:'#374151', whiteSpace:'nowrap' },
  badge:         { padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:600 },
  loginWrap:     { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#F3F4F6', padding:16 },
  loginCard:     { background:'#fff', borderRadius:16, padding:36, width:'100%', maxWidth:340, textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,0.1)', boxSizing:'border-box' },
  loginTitle:    { fontSize:22, fontWeight:700, color:'#3D1F0A', marginBottom:4 },
  loginSub:      { fontSize:14, color:'#6B7280', marginBottom:24 },
  input:         { width:'100%', padding:'11px 14px', border:'1.5px solid #E5E7EB', borderRadius:10, fontSize:14, marginBottom:12, outline:'none', boxSizing:'border-box' },
  authError:     { background:'#FEE2E2', color:'#991B1B', padding:'8px 12px', borderRadius:8, fontSize:13, marginBottom:12 },
  loginBtn:      { width:'100%', padding:13, background:'#3D1F0A', color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:600, cursor:'pointer' },
};