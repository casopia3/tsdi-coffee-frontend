import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder } from '../api';

const STATUS_CONFIG = {
  pending:   { emoji: '⏳', label: 'Order Received',  sub: 'Your order has been received.',          badge: 'badge-pending'   },
  confirmed: { emoji: '✅', label: 'Order Confirmed', sub: 'Payment confirmed! We are on it.',       badge: 'badge-confirmed' },
  preparing: { emoji: '👨‍🍳', label: 'Preparing',      sub: 'Your order is being prepared.',           badge: 'badge-preparing' },
  ready:     { emoji: '🎉', label: 'Ready!',          sub: 'Your order is ready. Enjoy your meal!',  badge: 'badge-ready'     },
  served:    { emoji: '☕', label: 'Served',           sub: 'Thank you for visiting Tsdi Coffee!',    badge: 'badge-served'    },
  cancelled: { emoji: '❌', label: 'Cancelled',       sub: 'This order was cancelled.',              badge: 'badge-pending'   },
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
    // Poll every 8 seconds for live status updates
    const interval = setInterval(fetchOrder, 8000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (loading) return (
    <div className="page">
      <div className="loading"><div className="spinner" /><span>Loading order...</span></div>
    </div>
  );

  if (!order) return (
    <div className="page">
      <div className="loading" style={{ color: '#C0392B' }}>Order not found.</div>
    </div>
  );

  const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

  return (
    <div className="page">
      <header className="header">
        <div className="header-brand">
          <span className="logo">☕</span>
          <div>
            <div className="name">Tsdi Coffee</div>
            <div className="sub">Order Status</div>
          </div>
        </div>
      </header>

      <div className="status-page">
        <div className={`status-icon ${order.status === 'ready' || order.status === 'served' ? 'success' : 'pending'}`}>
          {config.emoji}
        </div>

        <div className="status-title">{config.label}</div>
        <div className="status-sub">{config.sub}</div>

        {/* Order number */}
        <div className="order-card">
          <div className="order-card-label">Order number</div>
          <div className="order-num">#{orderId.slice(0, 8).toUpperCase()}</div>
          <div><span className={`status-badge ${config.badge}`}>{order.status.toUpperCase()}</span></div>
        </div>

        {/* Table */}
        <div className="order-card" style={{ marginTop: 8 }}>
          <div className="order-card-label">Table</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Table {order.table_number}</div>

          {/* Items */}
          <div className="order-items-list" style={{ marginTop: 12 }}>
            {order.items.map((item, i) => (
              <div key={i} className="order-item-row">
                <span>{item.quantity}× {item.name}</span>
                <span>ETB {(item.price * item.quantity).toFixed(0)}</span>
              </div>
            ))}
            <div className="order-item-row" style={{ fontWeight: 600, marginTop: 4 }}>
              <span>Total</span>
              <span>ETB {parseFloat(order.total).toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        {order.payment && (
          <div className="order-card" style={{ marginTop: 8 }}>
            <div className="order-card-label">Payment</div>
            <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>
              {order.payment.method} — {order.payment.status}
            </div>
          </div>
        )}

        <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 16 }}>
          Auto-refreshing every 8 seconds...
        </p>

        <button className="btn-outline" onClick={() => navigate('/menu?table=' + order.table_number)}>
          + Order More Items
        </button>
      </div>
    </div>
  );
}
