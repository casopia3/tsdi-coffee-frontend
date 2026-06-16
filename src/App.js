import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import MenuPage from './pages/MenuPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderStatusPage from './pages/OrderStatusPage';
import KitchenDashboard from './pages/KitchenDashboard';
import QRGenerator from './pages/QRGenerator';
import './App.css';

export default function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/menu"           element={<MenuPage />} />
          <Route path="/cart"           element={<CartPage />} />
          <Route path="/checkout"       element={<CheckoutPage />} />
          <Route path="/order/:orderId" element={<OrderStatusPage />} />
          <Route path="/kitchen"        element={<KitchenDashboard />} />
          <Route path="/qr"             element={<QRGenerator />} />
          <Route path="*"               element={<Navigate to="/menu?table=01" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}
