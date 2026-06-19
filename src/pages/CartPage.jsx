import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import t from '../i18n';

export default function CartPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || '01';
  const { cartItems, addItem, removeItem, subtotal, serviceCharge, total } = useCart();

  return (
    <div className="page">
      <header className="header">
        <button className="header-back" onClick={() => navigate(`/menu?table=${tableNumber}`)}>‹</button>
        <span className="header-title">{t.yourOrder}</span>
      </header>

      <div className="cart-list">
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <div className="icon">🛒</div>
            <p>{t.emptyCart}</p>
            <p style={{ marginTop: 6, fontSize: 12 }}>{t.emptyCartSub}</p>
          </div>
        ) : (
          cartItems.map(({ item, quantity }) => (
            <div key={item.id} className="cart-item">
              <span className="ci-emoji">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 8 }} />
                  : item.image_emoji}
              </span>
              <div className="ci-info">
                <div className="ci-name">{item.name}</div>
                <div className="ci-price">ETB {parseFloat(item.price).toFixed(0)} {t.each}</div>
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
          <div className="summary-row"><span>{t.subtotal}</span><span>ETB {subtotal.toFixed(0)}</span></div>
          <div className="summary-row"><span>{t.serviceCharge}</span><span>ETB {serviceCharge.toFixed(0)}</span></div>
          <div className="summary-total"><span>{t.total}</span><span>ETB {total.toFixed(0)}</span></div>
          <button
            className="btn-primary"
            onClick={() => navigate(`/checkout?table=${tableNumber}`)}
          >
            {t.proceedToPayment}
          </button>
        </div>
      )}
    </div>
  );
}
