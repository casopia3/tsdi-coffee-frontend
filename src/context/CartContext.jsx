import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState({}); // { menuItemId: { item, quantity } }

  const addItem = (item) => {
    setCart((prev) => ({
      ...prev,
      [item.id]: {
        item,
        quantity: (prev[item.id]?.quantity || 0) + 1,
      },
    }));
  };

  const removeItem = (itemId) => {
    setCart((prev) => {
      const next = { ...prev };
      if (next[itemId]?.quantity > 1) {
        next[itemId] = { ...next[itemId], quantity: next[itemId].quantity - 1 };
      } else {
        delete next[itemId];
      }
      return next;
    });
  };

  const clearCart = () => setCart({});

  const cartItems = Object.values(cart);
  const totalItems = cartItems.reduce((sum, e) => sum + e.quantity, 0);
  const subtotal = cartItems.reduce((sum, e) => sum + e.item.price * e.quantity, 0);
  const serviceCharge = parseFloat((subtotal * 0.05).toFixed(2));
  const total = parseFloat((subtotal + serviceCharge).toFixed(2));

  return (
    <CartContext.Provider value={{ cart, cartItems, addItem, removeItem, clearCart, totalItems, subtotal, serviceCharge, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
