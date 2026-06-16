import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || '01';
  const { cartItems, addItem, removeItem, subtotal, serviceCharge, total, totalItems } = useCart();

  return (
    <div className="page">
      <header className="header">
        <button className="header-back" onClick={() => navigate(`/menu?table=${tableNumber}`)}>‹</button>
        <span className="header-title">Your Order</span>
      </header>

      <div className="cart-list">
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <div className="icon">🛒</div>
            <p>Your cart is empty</p>
            <p style={{ marginTop: 6, fontSize: 12 }}>Go back and add some items!</p>
          </div>
        ) : (
          cartItems.map(({ item, quantity }) => (
            <div key={item.id} className="cart-item">
              <span className="ci-emoji">{item.image_emoji}</span>
              <div className="ci-info">
                <div className="ci-name">{item.name}</div>
                <div className="ci-price">ETB {parseFloat(item.price).toFixed(0)} each</div>
              </div>
              <div className="qty-ctrl">
                <button className="qty-btn" onClick={() => removeItem(item.id)}>−</button>
                <span className="qty-num">{quantity}</span>
                <button className="qty-btn" onClick={() => addItem(item)}>+</button>
              </div>
            </div>
          ))
        )}
      </div>

      {cartItems.length > 0 && (
        <div className="sticky-footer">
          <div className="summary-row"><span>Subtotal</span><span>ETB {subtotal.toFixed(0)}</span></div>
          <div className="summary-row"><span>Service charge (5%)</span><span>ETB {serviceCharge.toFixed(0)}</span></div>
          <div className="summary-total"><span>Total</span><span>ETB {total.toFixed(0)}</span></div>
          <button
            className="btn-primary"
            onClick={() => navigate(`/checkout?table=${tableNumber}`)}
          >
            Proceed to Payment
          </button>
        </div>
      )}
    </div>
  );
}
