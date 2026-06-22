import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder } from '../api';
import t from '../i18n';

const STATUS_CONFIG = {
  pending:   { emoji: '⏳', label: t.orderReceivedTitle,  sub: t.orderReceivedSub,  badge: 'badge-pending'   },
  confirmed: { emoji: '✅', label: t.orderConfirmedTitle, sub: t.orderConfirmedSub, badge: 'badge-confirmed' },
  preparing: { emoji: '👨‍🍳', label: t.orderPreparingTitle, sub: t.orderPreparingSub, badge: 'badge-preparing' },
  ready:     { emoji: '🎉', label: t.orderReadyTitle,     sub: t.orderReadySub,    badge: 'badge-ready'     },
  served:    { emoji: '☕', label: t.orderServedTitle,     sub: t.orderServedSub,   badge: 'badge-served'    },
  cancelled: { emoji: '❌', label: t.orderCancelledTitle, sub: t.orderCancelledSub, badge: 'badge-pending'   },
};

export default function OrderStatusPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = () => {
    getOrder(orderId)
      .then((res) => setOrder(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [orderId]);

  if (loading) return (
    <div className="page">
      <div className="loading"><div className="spinner" /><span>{t.loadingOrder}</span></div>
    </div>
  );

  if (!order) return (
    <div className="page">
      <div className="loading" style={{ color: '#C0392B' }}>{t.orderNotFound}</div>
    </div>
  );

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <div className="page">
      <header className="header">
        <div className="header-brand">
          <span className="logo">☕</span>
          <div>
            <div className="name">{t.brandName}</div>
            <div className="sub">{t.orderNumber}</div>
          </div>
        </div>
      </header>

      <div className="status-page">
        <div className={`status-icon ${order.status === 'ready' || order.status === 'served' ? 'success' : 'pending'}`}>
          {config.emoji}
        </div>

        <div className="status-title">{config.label}</div>
        <div className="status-sub">{config.sub}</div>

        <div className="order-card">
          <div className="order-card-label">{t.orderNumber}</div>
          <div className="order-num">#{orderId.slice(0, 8).toUpperCase()}</div>
          <div><span className={`status-badge ${config.badge}`}>{order.status.toUpperCase()}</span></div>
        </div>

        <div className="order-card" style={{ marginTop: 8 }}>
          <div className="order-card-label">{t.table}</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{t.table} {order.table_number}</div>

          <div className="order-items-list" style={{ marginTop: 12 }}>
            {order.items.map((item, i) => (
              <div key={i} className="order-item-row">
                <span>{item.quantity}× {item.name}</span>
                <span>ETB {(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
            <div className="order-item-row" style={{ fontWeight: 600, marginTop: 4 }}>
              <span>{t.total}</span>
              <span>ETB {parseFloat(order.total).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {order.payment && (
          <div className="order-card" style={{ marginTop: 8 }}>
            <div className="order-card-label">{t.payment}</div>
            <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>
              {order.payment.method} — {order.payment.status}
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 16 }}>
          {t.autoRefresh}
        </p>

        {(order.status === 'confirmed' || order.status === 'preparing' || order.status === 'ready' || order.status === 'served') && (
          <button
            className="btn-primary"
            style={{ marginBottom: 10 }}
            onClick={() => navigate(`/receipt/${orderId}`)}
          >
            🧾 ደረሰኝ ይመልከቱ
          </button>
        )}
        <button className="btn-outline" onClick={() => navigate('/menu?table=' + order.table_number)}>
          {t.orderMore}
        </button>
      </div>
    </div>
  );
}
