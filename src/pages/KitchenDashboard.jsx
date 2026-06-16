import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const STATUS_ORDER = ['confirmed', 'preparing', 'ready', 'served'];

const STATUS_CONFIG = {
  pending:   { label: 'Pending',   color: '#92400E', bg: '#FEF3C7', next: 'confirmed',  nextLabel: '✅ Confirm Payment' },
  confirmed: { label: 'Confirmed', color: '#1E40AF', bg: '#DBEAFE', next: 'preparing',  nextLabel: '👨‍🍳 Preparing' },
  preparing: { label: 'Preparing', color: '#92400E', bg: '#FEF3C7', next: 'ready',      nextLabel: '🔔 Mark Ready' },
  ready:     { label: 'Ready!',    color: '#065F46', bg: '#D1FAE5', next: 'served',     nextLabel: '✔ Served' },
  served:    { label: 'Served',    color: '#065F46', bg: '#D1FAE5', next: null,         nextLabel: null },
};

const api = axios.create({ baseURL: '/api' });

export default function KitchenDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [updating, setUpdating] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get('/orders', {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('admin_pw')}` },
      });
      setOrders(res.data.data);
      setLastRefresh(new Date());
    } catch (err) {
      if (err.response?.status === 403) {
        setAuthed(false);
        sessionStorage.removeItem('admin_pw');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_pw');
    if (saved) { setAuthed(true); }
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [authed, fetchOrders]);

  const handleLogin = () => {
    sessionStorage.setItem('admin_pw', password);
    setAuthed(true);
    setAuthError('');
    // verify immediately
    api.get('/orders', { headers: { Authorization: `Bearer ${password}` } })
      .then(() => setAuthed(true))
      .catch(() => {
        setAuthError('Wrong password. Check ADMIN_PASSWORD in your .env file.');
        setAuthed(false);
        sessionStorage.removeItem('admin_pw');
      });
  };

  const updateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${sessionStorage.getItem('admin_pw')}` } }
      );
      fetchOrders();
    } catch (err) {
      alert('Failed to update order status.');
    } finally {
      setUpdating(null);
    }
  };

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginCard}>
          <div style={styles.loginLogo}>☕</div>
          <div style={styles.loginTitle}>Tsdi Coffee</div>
          <div style={styles.loginSub}>Kitchen Dashboard</div>
          <input
            style={styles.input}
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {authError && <div style={styles.authError}>{authError}</div>}
          <button style={styles.loginBtn} onClick={handleLogin}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ── Group orders by status ──────────────────────────────────────────────────
  const grouped = {
    pending:   orders.filter(o => o.status === 'pending'),
    confirmed: orders.filter(o => o.status === 'confirmed'),
    preparing: orders.filter(o => o.status === 'preparing'),
    ready:     orders.filter(o => o.status === 'ready'),
  };

  const totalActive = orders.length;

  return (
    <div style={styles.page}>
      {/* Top bar */}
      <div style={styles.topbar}>
        <div>
          <div style={styles.topTitle}>☕ Kitchen Dashboard</div>
          <div style={styles.topSub}>
            {totalActive} active order{totalActive !== 1 ? 's' : ''} · refreshed {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
        <button style={styles.refreshBtn} onClick={fetchOrders}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading orders...</div>
      ) : orders.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🍵</div>
          <div>No active orders right now</div>
          <div style={{ fontSize: 13, marginTop: 6, color: '#9CA3AF' }}>Auto-refreshing every 8 seconds</div>
        </div>
      ) : (
        <div style={styles.columns}>
          {['pending', 'confirmed', 'preparing', 'ready'].map((status) => (
            <div key={status} style={styles.column}>
              {/* Column header */}
              <div style={{ ...styles.colHeader, background: STATUS_CONFIG[status].bg, color: STATUS_CONFIG[status].color }}>
                {STATUS_CONFIG[status].label}
                <span style={styles.colCount}>{grouped[status].length}</span>
              </div>

              {grouped[status].length === 0 ? (
                <div style={styles.colEmpty}>No orders</div>
              ) : (
                grouped[status].map((order) => (
                  <div key={order.id} style={styles.orderCard}>
                    {/* Order header */}
                    <div style={styles.orderHeader}>
                      <div style={styles.tableNum}>Table {order.table_number}</div>
                      <div style={styles.orderTime}>
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</div>

                    {/* Items */}
                    <div style={styles.itemsList}>
                      {order.items.map((item, i) => (
                        <div key={i} style={styles.itemRow}>
                          <span style={styles.itemQty}>{item.quantity}×</span>
                          <span style={styles.itemName}>{item.name}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div style={styles.orderTotal}>
                      ETB {parseFloat(order.total).toFixed(0)}
                    </div>

                    {/* Action button */}
                    {STATUS_CONFIG[status].next && (
                      <button
                        style={{
                          ...styles.actionBtn,
                          opacity: updating === order.id ? 0.6 : 1,
                        }}
                        onClick={() => updateStatus(order.id, STATUS_CONFIG[status].next)}
                        disabled={updating === order.id}
                      >
                        {updating === order.id ? 'Updating...' : STATUS_CONFIG[status].nextLabel}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#F3F4F6', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  topbar: { background: '#3D1F0A', color: '#F5ECD7', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  topTitle: { fontSize: 18, fontWeight: 700 },
  topSub: { fontSize: 12, color: '#C49A6C', marginTop: 2 },
  refreshBtn: { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#F5ECD7', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  columns: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: 20, alignItems: 'start' },
  column: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  colHeader: { padding: '10px 14px', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  colCount: { background: 'rgba(0,0,0,0.12)', borderRadius: 20, padding: '2px 8px', fontSize: 12 },
  colEmpty: { padding: '20px 14px', fontSize: 13, color: '#9CA3AF', textAlign: 'center' },
  orderCard: { margin: 10, border: '1px solid #E5E7EB', borderRadius: 10, padding: 12, background: '#FAFAFA' },
  orderHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  tableNum: { fontWeight: 700, fontSize: 15, color: '#3D1F0A' },
  orderTime: { fontSize: 11, color: '#9CA3AF' },
  orderId: { fontSize: 11, color: '#9CA3AF', marginBottom: 8 },
  itemsList: { marginBottom: 8 },
  itemRow: { display: 'flex', gap: 6, fontSize: 13, padding: '2px 0', borderBottom: '1px solid #F3F4F6' },
  itemQty: { fontWeight: 700, color: '#3D1F0A', minWidth: 24 },
  itemName: { color: '#374151' },
  orderTotal: { fontSize: 13, fontWeight: 700, color: '#6B3A1F', textAlign: 'right', marginBottom: 10 },
  actionBtn: { width: '100%', padding: '8px 0', background: '#3D1F0A', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  loading: { textAlign: 'center', padding: 60, color: '#6B7280' },
  empty: { textAlign: 'center', padding: 80, color: '#6B7280', fontSize: 15 },
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' },
  loginCard: { background: '#fff', borderRadius: 16, padding: 36, width: 320, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' },
  loginLogo: { fontSize: 48, marginBottom: 8 },
  loginTitle: { fontSize: 22, fontWeight: 700, color: '#3D1F0A' },
  loginSub: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  input: { width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, marginBottom: 10, outline: 'none' },
  authError: { background: '#FEE2E2', color: '#991B1B', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 10 },
  loginBtn: { width: '100%', padding: 13, background: '#3D1F0A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
