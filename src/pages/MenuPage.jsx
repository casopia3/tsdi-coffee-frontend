import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getMenu } from '../api';
import { useCart } from '../context/CartContext';

export default function MenuPage() {
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get('table') || '01';
  const navigate = useNavigate();
  const { addItem, totalItems } = useCart();

  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flashId, setFlashId] = useState(null);

  useEffect(() => {
    getMenu()
      .then((res) => setCategories(res.data.data))
      .catch(() => setError('Failed to load menu. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  const allItems = categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, category: c.category }))
  );

  const displayed =
    activeCategory === 'all'
      ? allItems
      : allItems.filter((i) => i.category === activeCategory);

  const handleAdd = (item) => {
    addItem(item);
    setFlashId(item.id);
    setTimeout(() => setFlashId(null), 400);
  };

  if (loading) return (
    <div className="page">
      <div className="loading"><div className="spinner" /><span>Loading menu...</span></div>
    </div>
  );

  if (error) return (
    <div className="page">
      <div className="loading" style={{ color: '#C0392B' }}>{error}</div>
    </div>
  );

  return (
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <span className="logo">☕</span>
          <div>
            <div className="name">Tsdi Coffee</div>
            <div className="sub">Ethiopian Coffee House</div>
          </div>
        </div>
        <button className="cart-btn" onClick={() => navigate(`/cart?table=${tableNumber}`)}>
          🛒 <span className="cart-badge">{totalItems}</span>
        </button>
      </header>

      {/* Table tag */}
      <div className="table-tag">
        📍 Table <strong>{tableNumber}</strong> &nbsp;·&nbsp; QR scan confirmed
      </div>

      {/* Category tabs */}
      <div className="cats">
        <button
          className={`cat-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.category}
            className={`cat-btn ${activeCategory === c.category ? 'active' : ''}`}
            onClick={() => setActiveCategory(c.category)}
          >
            {c.category}
          </button>
        ))}
      </div>

      {/* Menu grid */}
      <div className="menu-body">
        <div className="menu-grid">
          {displayed.map((item) => (
            <div key={item.id} className="item-card">
              <div className="item-emoji">{item.image_emoji}</div>
              <div className="item-info">
                <div className="item-name">{item.name}</div>
                <div className="item-desc">{item.description}</div>
                <div className="item-footer">
                  <span className="item-price">ETB {parseFloat(item.price).toFixed(0)}</span>
                  <button
                    className="add-btn"
                    style={{ background: flashId === item.id ? '#C49A6C' : undefined }}
                    onClick={() => handleAdd(item)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
