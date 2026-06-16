import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { createOrder, initiatePayment } from '../api';

const PAYMENT_METHODS = [
  { id: 'chapa',    name: 'Chapa',           desc: 'CBE, Awash, Dashen & more',  iconClass: 'pm-chapa',    icon: 'Chapa' },
  { id: 'telebirr', name: 'Telebirr',        desc: 'Ethio Telecom mobile wallet', iconClass: 'pm-telebirr', icon: 'Telebirr' },
  { id: 'card',     name: 'Debit / Credit',  desc: 'Visa & Mastercard',           iconClass: 'pm-card',     icon: '💳' },
  { id: 'cash',     name: 'Pay at Counter',  desc: 'Cash when served',            iconClass: 'pm-cash',     icon: '💵' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || '01';
  const { cartItems, total, subtotal, serviceCharge, clearCart } = useCart();

  const [selectedMethod, setSelectedMethod] = useState('chapa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (cartItems.length === 0) return;
    setLoading(true);
    setError('');

    try {
      // 1. Create order
      const orderRes = await createOrder({
        table_number: tableNumber,
        items: cartItems.map(({ item, quantity }) => ({
          menu_item_id: item.id,
          quantity,
        })),
      });
      const order = orderRes.data.data;

      // 2. Initiate payment
      const payRes = await initiatePayment({
        order_id: order.id,
        method: selectedMethod,
      });
      const payData = payRes.data.data;

      clearCart();

      // 3. If Chapa returned a checkout URL, redirect there
      if (payData.checkout_url) {
        window.location.href = payData.checkout_url;
      } else {
        // Cash or fallback — go straight to order status
        navigate(`/order/${order.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    navigate(`/menu?table=${tableNumber}`);
    return null;
  }

  return (
    <div className="page">
      <header className="header">
        <button className="header-back" onClick={() => navigate(`/cart?table=${tableNumber}`)}>‹</button>
        <span className="header-title">Payment</span>
      </header>

      <div className="pay-methods">
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>Choose how you want to pay</p>

        {PAYMENT_METHODS.map((method) => (
          <div
            key={method.id}
            className={`pay-method ${selectedMethod === method.id ? 'selected' : ''}`}
            onClick={() => setSelectedMethod(method.id)}
          >
            <div className={`pm-icon ${method.iconClass}`}>{method.icon}</div>
            <div className="pm-info">
              <div className="pm-name">{method.name}</div>
              <div className="pm-desc">{method.desc}</div>
            </div>
            <div className="pm-radio" />
          </div>
        ))}

        {error && (
          <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 8 }}>
            {error}
          </div>
        )}
      </div>

      <div className="sticky-footer">
        <div className="summary-row"><span>Subtotal</span><span>ETB {subtotal.toFixed(0)}</span></div>
        <div className="summary-row"><span>Service charge (5%)</span><span>ETB {serviceCharge.toFixed(0)}</span></div>
        <div className="summary-total"><span>Total</span><span>ETB {total.toFixed(0)}</span></div>
        <button className="btn-primary" onClick={handleConfirm} disabled={loading}>
          {loading ? 'Processing...' : `Confirm & Pay ETB ${total.toFixed(0)}`}
        </button>
      </div>
    </div>
  );
}
