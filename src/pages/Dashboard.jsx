import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const api = axios.create({ baseURL: API_BASE });

// ── Sound & browser notification helpers ──────────────────────────────────────
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Play 3 quick beeps
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
  } catch (e) {
    console.log('Audio not supported', e);
  }
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

// Bust caches with a timestamp param only — avoids CORS preflight issues
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

// ── Auth helpers ──────────────────────────────────────────────────────────────
const ADMIN_PW  = process.env.REACT_APP_ADMIN_PASSWORD  || 'admin123';
const KITCHEN_PW = process.env.REACT_APP_KITCHEN_PASSWORD || 'kitchen123';

function getRole(pw) {
  if (pw === ADMIN_PW)   return 'admin';
  if (pw === KITCHEN_PW) return 'kitchen';
  return null;
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [password, setPassword]   = useState('');
  const [role, setRole]           = useState(null); // 'admin' | 'kitchen' | null
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('orders');

  useEffect(() => {
    const saved = sessionStorage.getItem('dashboard_role');
    if (saved) setRole(saved);
  }, []);

  const handleLogin = () => {
    const r = getRole(password);
    if (r) {
      sessionStorage.setItem('dashboard_role', r);
      sessionStorage.setItem('dashboard_pw', password);
      setRole(r);
      setAuthError('');
    } else {
      setAuthError('Wrong password. Try again.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('dashboard_role');
    sessionStorage.removeItem('dashboard_pw');
    setRole(null);
    setPassword('');
  };

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!role) {
    return (
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
          />
          {authError && <div style={S.authError}>{authError}</div>}
          <button style={S.loginBtn} onClick={handleLogin}>Sign In</button>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 16 }}>
            Kitchen staff use kitchen password · Managers use admin password
          </div>
        </div>
      </div>
    );
  }

  const tabs = role === 'admin'
    ? [
        { id: 'orders',  label: '📋 Orders'  },
        { id: 'menu',    label: '🍽️ Menu'    },
        { id: 'history', label: '📊 Revenue'  },
      ]
    : [
        { id: 'orders', label: '📋 Orders' },
      ];

  return (
    <div style={S.page}>
      {/* Sidebar */}
      <div style={S.sidebar}>
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
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button style={S.logoutBtn} onClick={handleLogout}>🚪 Sign Out</button>
      </div>

      {/* Main content */}
      <div style={S.main}>
        {activeTab === 'orders'  && <OrdersView role={role} />}
        {activeTab === 'menu'    && role === 'admin' && <MenuView />}
        {activeTab === 'history' && role === 'admin' && <RevenueView />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS VIEW (kitchen + admin)
// ══════════════════════════════════════════════════════════════════════════════
function OrdersView({ role }) {
  const [orders, setOrders]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [updating, setUpdating]     = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const prevPendingCount = useRef(0);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('dashboard_pw')}` },
      });
      const newOrders = res.data.data;
      const newPendingCount = newOrders.filter(o => o.status === 'pending').length;

      // If pending orders increased → new order arrived!
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
      {/* New order alert banner */}
      {newOrderAlert && (
        <div style={{
          background: '#3D1F0A', color: '#F5ECD7',
          padding: '12px 20px', fontSize: 15, fontWeight: 600,
          textAlign: 'center', animation: 'pulse 0.5s ease-in-out',
        }}>
          🔔 አዲስ ትዕዛዝ ደርሷል! — New order arrived!
        </div>
      )}

      <div style={S.pageHeader}>
        <div>
          <div style={S.pageTitle}>Live Orders</div>
          <div style={S.pageSub}>{orders.length} active · refreshed {lastRefresh.toLocaleTimeString()}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ ...S.refreshBtn, background: '#C49A6C', color: '#3D1F0A', fontSize: 12 }}
            onClick={requestNotificationPermission}
            title="Enable browser notifications"
          >
            🔔
          </button>
          <button style={S.refreshBtn} onClick={fetchOrders}>↻ Refresh</button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div style={S.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍵</div>
          <div>No active orders right now</div>
          <div style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>Auto-refreshing every 8 seconds</div>
        </div>
      ) : (
        <div style={S.columns}>
          {['pending','confirmed','preparing','ready'].map(status => (
            <div key={status} style={S.column}>
              <div style={{ ...S.colHeader, background: STATUS_CONFIG[status].bg, color: STATUS_CONFIG[status].color }}>
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
                        style={{ ...S.actionBtn, opacity: updating === order.id ? 0.6 : 1 }}
                        onClick={() => updateStatus(order.id, STATUS_CONFIG[status].next)}
                        disabled={updating === order.id}
                      >
                        {updating === order.id ? 'Updating...' : STATUS_CONFIG[status].nextLabel}
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
// MENU VIEW (admin only)
// ══════════════════════════════════════════════════════════════════════════════
function MenuView() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // { mode: 'add'|'edit', item? }
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ name:'', description:'', price:'', image_emoji:'☕', image_url:'', category_id:'', is_available: true });
  const [uploading, setUploading]   = useState(false);

  const pw = sessionStorage.getItem('dashboard_pw');
  const headers = { Authorization: `Bearer ${pw}` };

  const fetchMenu = useCallback(async () => {
    try {
      const res = await api.get('/menu');
      setCategories(res.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const openAdd = (categoryId) => {
    setForm({ name:'', description:'', price:'', image_emoji:'☕', category_id: categoryId, is_available: true });
    setModal({ mode: 'add' });
  };

  const openEdit = (item, categoryId) => {
    setForm({ name: item.name, description: item.description, price: item.price, image_emoji: item.image_emoji, image_url: item.image_url || '', category_id: categoryId, is_available: item.is_available });
    setModal({ mode: 'edit', itemId: item.id });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      setForm(f => ({ ...f, image_url: url }));
    } catch (err) {
      alert('Image upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveItem = async () => {
    if (!form.name || !form.price) return alert('Name and price are required');
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description,
      price: parseFloat(form.price),
      image_emoji: form.image_emoji,
      image_url: form.image_url || null,
      category_id: form.category_id,
      is_available: form.is_available,
    };
    try {
      if (modal.mode === 'add') {
        await axios.post(`${API_BASE}/menu`, payload, { headers });
      } else {
        await axios.put(`${API_BASE}/menu/${modal.itemId}`, payload, { headers });
      }
      setModal(null);
      fetchMenu();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save item');
    } finally { setSaving(false); }
  };

  const toggleAvailability = async (itemId, current) => {
    try {
      await axios.patch(`${API_BASE}/menu/${itemId}/availability`, { is_available: !current }, { headers });
      fetchMenu();
    } catch { alert('Failed to update'); }
  };

  const deleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      await axios.delete(`${API_BASE}/menu/${itemId}`, { headers });
      fetchMenu();
    } catch { alert('Failed to delete'); }
  };

  if (loading) return <div style={S.loading}>Loading menu...</div>;

  return (
    <div>
      <div style={S.pageHeader}>
        <div>
          <div style={S.pageTitle}>Menu Manager</div>
          <div style={S.pageSub}>Add, edit, or disable menu items</div>
        </div>
      </div>

      {categories.map(cat => (
        <div key={cat.category_id} style={S.menuSection}>
          <div style={S.menuCatHeader}>
            <span style={S.menuCatName}>{cat.category}</span>
            <button style={S.addItemBtn} onClick={() => openAdd(cat.category_id)}>+ Add Item</button>
          </div>
          <div style={S.menuGrid}>
            {cat.items.map(item => (
              <div key={item.id} style={{ ...S.menuCard, opacity: item.is_available ? 1 : 0.5 }}>
              <div
  style={{
    height:180,
    overflow:'hidden',
    background:'#F7F5F2'
  }}
>
  {item.image_url ? (
    <img
      src={item.image_url}
      alt={item.name}
      style={{
        width:'100%',
        height:'100%',
        objectFit:'cover'
      }}
    />
  ) : (
    <div
      style={{
        height:'100%',
        display:'flex',
        justifyContent:'center',
        alignItems:'center',
        fontSize:70
      }}
    >
      {item.image_emoji}
    </div>
  )}
</div>
 <div style={S.menuItemName}>{item.name}</div>
                <div style={S.menuItemDesc}>{item.description}</div>
                <div style={S.menuItemPrice}>ETB {parseFloat(item.price).toFixed(0)}</div>
                <div style={S.menuItemActions}>
                  <button style={S.editBtn} onClick={() => openEdit(item, cat.category_id)}>✏️</button>
                  <button
                    style={{ ...S.toggleBtn, background: item.is_available ? '#FEF3C7' : '#D1FAE5' }}
                    onClick={() => toggleAvailability(item.id, item.is_available)}
                  >
                    {item.is_available ? '🔴 Disable' : '🟢 Enable'}
                  </button>
                  <button style={S.deleteBtn} onClick={() => deleteItem(item.id)}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Modal */}
      {modal && (
        <div style={S.modalOverlay}>
          <div style={S.modalCard}>
            <div style={S.modalTitle}>{modal.mode === 'add' ? 'Add New Item' : 'Edit Item'}</div>

            <label style={S.label}>Name *</label>
            <input style={S.input} value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Macchiato" />

            <label style={S.label}>Description</label>
            <input style={S.input} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Short description" />

            <label style={S.label}>Price (ETB) *</label>
            <input style={S.input} type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} placeholder="45" />

            <label style={S.label}>Emoji Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {EMOJIS.map(e => (
                <button
                  key={e}
                  style={{ ...S.emojiBtn, background: form.image_emoji === e ? '#3D1F0A' : '#F3F4F6', color: form.image_emoji === e ? '#fff' : '#000' }}
                  onClick={() => setForm({...form, image_emoji: e})}
                >
                  {e}
                </button>
              ))}
            </div>

            <label style={S.label}>Item Photo</label>
           {form.image_url && (
  <div style={{ position: 'relative', marginBottom: 10 }}>
    <img src={form.image_url} alt="preview" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }} />
    <button
      onClick={() => setForm(f => ({ ...f, image_url: '' }))}
      style={{
        position: 'absolute', top: 8, right: 8,
        background: '#C0392B', color: '#fff',
        border: 'none', borderRadius: 6,
        padding: '4px 10px', fontSize: 12,
        cursor: 'pointer', fontWeight: 600,
      }}
    >
      🗑 Remove Photo
    </button>
  </div>
)}
            <label style={{
              display: 'block', padding: '10px', border: '1.5px dashed #C49A6C',
              borderRadius: 10, textAlign: 'center', cursor: 'pointer',
              fontSize: 13, color: '#6B7280', marginBottom: 12,
              background: uploading ? '#F9FAFB' : '#fff'
            }}>
              {uploading ? '⏳ Uploading...' : form.image_url ? '🔄 Change Photo' : '📷 Upload Photo'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploading} />
            </label>

            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={{ ...S.loginBtn, flex: 1 }} onClick={saveItem} disabled={saving}>
                {saving ? 'Saving...' : modal.mode === 'add' ? 'Add Item' : 'Save Changes'}
              </button>
              <button style={{ ...S.loginBtn, flex: 1, background: '#6B7280' }} onClick={() => setModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REVENUE VIEW (admin only)
// ══════════════════════════════════════════════════════════════════════════════
function RevenueView() {
  const [stats, setStats]   = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const pw = sessionStorage.getItem('dashboard_pw');

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await api.get('/orders/history', {
          headers: { Authorization: `Bearer ${pw}` }
        });
        const all = res.data.data;
        setOrders(all);
        const today = new Date().toDateString();
        const todayOrders = all.filter(o => new Date(o.created_at).toDateString() === today);
        setStats({
          todayRevenue: todayOrders.reduce((s,o) => s + parseFloat(o.total), 0),
          todayOrders:  todayOrders.length,
          totalRevenue: all.reduce((s,o) => s + parseFloat(o.total), 0),
          totalOrders:  all.length,
        });
      } catch {}
      finally { setLoading(false); }
    };
    fetchAll();
  }, [pw]);

  if (loading) return <div style={S.loading}>Loading revenue data...</div>;

  return (
    <div>
      <div style={S.pageHeader}>
        <div>
          <div style={S.pageTitle}>Revenue & Orders</div>
          <div style={S.pageSub}>Business overview</div>
        </div>
      </div>

      {stats && (
        <div style={S.statsGrid}>
          <div style={S.statCard}>
            <div style={S.statLabel}>Today's Revenue</div>
            <div style={S.statValue}>ETB {stats.todayRevenue.toFixed(0)}</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Today's Orders</div>
            <div style={S.statValue}>{stats.todayOrders}</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Total Revenue</div>
            <div style={S.statValue}>ETB {stats.totalRevenue.toFixed(0)}</div>
          </div>
          <div style={S.statCard}>
            <div style={S.statLabel}>Total Orders</div>
            <div style={S.statValue}>{stats.totalOrders}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={S.menuCatName}>Recent Orders</div>
        <table style={S.table}>
          <thead>
            <tr>
              {['Order #','Table','Items','Total','Payment','Status','Time'].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.slice(0,50).map(order => (
              <tr key={order.id} style={S.tr}>
                <td style={S.td}>#{order.id.slice(0,8).toUpperCase()}</td>
                <td style={S.td}>Table {order.table_number}</td>
                <td style={S.td}>{order.items?.length || '-'} items</td>
                <td style={S.td}>ETB {parseFloat(order.total).toFixed(0)}</td>
                <td style={S.td}>{order.payment?.method || 'cash'}</td>
                <td style={S.td}>
                  <span style={{ ...S.badge, background: STATUS_CONFIG[order.status]?.bg || '#F3F4F6', color: STATUS_CONFIG[order.status]?.color || '#374151' }}>
                    {order.status}
                  </span>
                </td>
                <td style={S.td}>{new Date(order.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const S = {
page: {
  display: 'flex',
  minHeight: '100vh',
  fontFamily: '"Inter","Segoe UI",sans-serif',
  background: '#F7F6F3',
},
sidebar: {
  width: 250,
  background: 'linear-gradient(180deg,#2A1408 0%, #3D1F0A 100%)',
  display: 'flex',
  flexDirection: 'column',
  padding: '24px 18px',
  minHeight: '100vh',
  position: 'sticky',
  top: 0,
  boxShadow: '6px 0 20px rgba(0,0,0,.15)',
},
sidebarLogo: {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  marginBottom: 34,
  paddingBottom: 22,
  borderBottom: '1px solid rgba(255,255,255,.08)',
},
sidebarName: {
  color: '#FFF8F0',
  fontWeight: 700,
  fontSize: 20,
  letterSpacing: '.3px',
},
sidebarRole: {
  color: '#D8B48A',
  fontSize: 13,
  marginTop: 4,
},
nav:{
  flex:1,
  display:'flex',
  flexDirection:'column',
  gap:10,
},
navBtn: {
  background: 'transparent',
  border: 'none',
  color: '#D8B48A',
  padding: '13px 16px',
  borderRadius: 12,
  fontSize: 15,
  cursor: 'pointer',
  textAlign: 'left',
  fontWeight: 600,
  transition: 'all .25s ease',
},
navBtnActive: {
  background: '#5B3316',
  color: '#FFF',
  boxShadow: '0 6px 16px rgba(0,0,0,.18)',
},
logoutBtn: {
  background: '#5B3316',
  color: '#fff',
  border: 'none',
  padding: '12px',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  transition: '.25s'
},
main:{
  flex:1,
  padding:'32px',
  overflow:'auto',
  background:'#F7F5F2'
},
 pageHeader:{
  display:'flex',
  justifyContent:'space-between',
  alignItems:'center',
  marginBottom:30,
},
pageTitle:{
  fontSize:30,
  fontWeight:800,
  color:'#2A1408',
},
pageSub:{
  marginTop:6,
  fontSize:14,
  color:'#7A7A7A',
},
refreshBtn:{
  background:'#3D1F0A',
  color:'#fff',
  border:'none',
  padding:'12px 22px',
  borderRadius:12,
  fontWeight:700,
  cursor:'pointer',
  boxShadow:'0 10px 20px rgba(61,31,10,.18)',
},
  columns:       { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, alignItems: 'start' },
  column:        { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  colHeader:     { padding: '10px 14px', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  colCount:      { background: 'rgba(0,0,0,0.12)', borderRadius: 20, padding: '2px 8px', fontSize: 12 },
  colEmpty:      { padding: '20px 14px', fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  orderCard:     { margin: 10, border: '1px solid #E5E7EB', borderRadius: 10, padding: 12, background: '#FAFAFA' },
  orderHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  tableNum:      { fontWeight: 700, fontSize: 15, color: '#3D1F0A' },
  orderTime:     { fontSize: 11, color: '#9CA3AF' },
  orderId:       { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },
  itemsList:     { marginBottom: 8 },
  itemRow:       { display: 'flex', gap: 6, fontSize: 13, padding: '2px 0', borderBottom: '1px solid #F3F4F6' },
  itemQty:       { fontWeight: 700, color: '#3D1F0A', minWidth: 24 },
  itemName:      { color: '#374151' },
  orderTotal:    { fontSize: 13, fontWeight: 700, color: '#6B3A1F', textAlign: 'right', marginBottom: 10 },
  actionBtn:     { width: '100%', padding: '8px 0', background: '#3D1F0A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  loading:       { textAlign: 'center', padding: 60, color: '#6B7280', fontSize: 15 },
  empty:         { textAlign: 'center', padding: 80, color: '#6B7280', fontSize: 15 },
  // Menu styles
  menuSection:   { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  menuCatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  menuCatName:   { fontSize: 16, fontWeight: 700, color: '#3D1F0A' },
  addItemBtn:    { background: '#3D1F0A', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
 menuGrid:{
  display:'grid',
  gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',
  gap:'22px',
},
 menuCard:{
  background:'#FFFFFF',
  border:'1px solid #ECECEC',
  borderRadius:'18px',
  overflow:'hidden',
  boxShadow:'0 8px 22px rgba(0,0,0,.06)',
  transition:'all .25s ease',
  display:'flex',
  flexDirection:'column',
},
  menuEmoji:     { fontSize: 28, marginBottom: 6 },
menuItemName:{
    fontSize:18,
    fontWeight:700,
    color:'#2A1408',
    marginTop:14,
    marginBottom:6,
    padding:'0 16px'
},
menuItemDesc:{
    fontSize:13,
    color:'#6B7280',
    lineHeight:1.6,
    minHeight:42,
    padding:'0 16px'
},
 menuItemPrice:{
    fontSize:22,
    fontWeight:800,
    color:'#3D1F0A',
    padding:'12px 16px',
},
menuItemActions:{
    display:'flex',
    gap:10,
    padding:'0 16px 18px',
},
editBtn:{
    flex:1,
    background:'#FFFFFF',
    border:'1px solid #DDD',
    borderRadius:10,
    padding:'10px',
    cursor:'pointer',
    fontWeight:600,
},
toggleBtn:{
    flex:2,
    border:'none',
    borderRadius:10,
    padding:'10px',
    cursor:'pointer',
    fontWeight:700,
},
deleteBtn:{
    width:46,
    background:'#FFE7E7',
    border:'none',
    borderRadius:10,
    cursor:'pointer',
    fontSize:18,
},
  // Modal
  modalOverlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalCard:     { background: '#fff', borderRadius: 16, padding: 28, width: 420, maxHeight: '90vh', overflow: 'auto' },
  modalTitle:    { fontSize: 18, fontWeight: 700, color: '#3D1F0A', marginBottom: 20 },
  label:         { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 4 },
  emojiBtn:      { width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 18 },
  // Revenue
  statsGrid:     { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 },
  statCard:      { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  statLabel:     { fontSize: 12, color: '#6B7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue:     { fontSize: 24, fontWeight: 700, color: '#3D1F0A' },
  table:         { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  th:            { padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  tr:            { borderBottom: '1px solid #F3F4F6' },
  td:            { padding: '12px 16px', fontSize: 13, color: '#374151' },
  badge:         { padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  // Login
  loginWrap:     { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' },
  loginCard:     { background: '#fff', borderRadius: 16, padding: 36, width: 340, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' },
  loginTitle:    { fontSize: 22, fontWeight: 700, color: '#3D1F0A', marginBottom: 4 },
  loginSub:      { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  input:         { width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' },
  authError:     { background: '#FEE2E2', color: '#991B1B', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 12 },
  loginBtn:      { width: '100%', padding: 13, background: '#3D1F0A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
