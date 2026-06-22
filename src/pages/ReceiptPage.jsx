import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder } from '../api';

export default function ReceiptPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const receiptRef = useRef();

  useEffect(() => {
    getOrder(orderId)
      .then((res) => setOrder(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  const handlePrint = () => window.print();

  const handleScreenshot = async () => {
    // Simple approach — just tell user to screenshot
    alert('ስክሪንሾት ለማንሳት:\nAndroid: Power + Volume Down\niPhone: Power + Volume Up\nPC: Windows + Shift + S');
  };

  if (loading) return (
    <div style={S.page}>
      <div style={S.loading}>⏳ ደረሰኝ በመጫን ላይ...</div>
    </div>
  );

  if (!order) return (
    <div style={S.page}>
      <div style={S.loading}>ትዕዛዝ አልተገኘም።</div>
    </div>
  );

  const now = new Date(order.created_at);
  const dateStr = now.toLocaleDateString('am-ET', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('am-ET', { hour: '2-digit', minute: '2-digit' });

  const paymentLabels = {
    chapa: 'Chapa',
    telebirr: 'Telebirr',
    card: 'ካርድ',
    cash: 'ጥሬ ገንዘብ',
  };

  return (
    <div style={S.page}>
      {/* Action buttons - hidden on print */}
      <div style={S.actions} className="no-print">
        <button style={S.backBtn} onClick={() => navigate('/menu?table=' + order.table_number)}>
          ← ወደ Manu ተመለስ
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={S.screenshotBtn} onClick={handleScreenshot}>
            📸 ScreenShot
          </button>
          <button style={S.printBtn} onClick={handlePrint}>
            🖨 Print
          </button>
        </div>
      </div>

      {/* Receipt */}
      <div style={S.receipt} ref={receiptRef}>
        {/* Header */}
        <div style={S.header}>
          <div style={S.logo}>☕</div>
          <div style={S.brandName}>Tsdi Coffee</div>
          <div style={S.brandSub}>የኢትዮጵያ ቡና ቤት</div>
          <div style={S.divider}>- - - - - - - - - - - - - - - - - -</div>
        </div>

        {/* Receipt title */}
        <div style={S.receiptTitle}>ደረሰኝ / RECEIPT</div>

        {/* Order info */}
        <div style={S.infoSection}>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>ቀን:</span>
            <span style={S.infoValue}>{dateStr}</span>
          </div>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>ሰዓት:</span>
            <span style={S.infoValue}>{timeStr}</span>
          </div>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>ትዕዛዝ #:</span>
            <span style={S.infoValue}>#{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div style={S.infoRow}>
            <span style={S.infoLabel}>ጠረጴዛ:</span>
            <span style={S.infoValue}>ጠረጴዛ {order.table_number}</span>
          </div>
          {order.payment && (
            <div style={S.infoRow}>
              <span style={S.infoLabel}>ክፍያ:</span>
              <span style={S.infoValue}>{paymentLabels[order.payment.method] || order.payment.method}</span>
            </div>
          )}
        </div>

        <div style={S.divider}>- - - - - - - - - - - - - - - - - -</div>

        {/* Items */}
        <div style={S.itemsSection}>
          <div style={S.itemsHeader}>
            <span>ዕቃ</span>
            <span>ብዛት</span>
            <span>ዋጋ</span>
          </div>
          <div style={{ ...S.divider, margin: '6px 0' }}>──────────────────</div>
          {order.items.map((item, i) => (
            <div key={i} style={S.itemRow}>
              <span style={S.itemName}>{item.name}</span>
              <span style={S.itemQty}>{item.quantity}×</span>
              <span style={S.itemPrice}>ETB {(parseFloat(item.price) * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div style={{ ...S.divider, margin: '10px 0' }}>──────────────────</div>

        {/* Totals */}
        <div style={S.totalsSection}>
          <div style={S.totalRow}>
            <span>ድምር</span>
            <span>ETB {parseFloat(order.subtotal).toFixed(0)}</span>
          </div>
          <div style={S.totalRow}>
            <span>የአገልግሎት ክፍያ (5%)</span>
            <span>ETB {parseFloat(order.service_charge).toFixed(0)}</span>
          </div>
          <div style={{ ...S.divider, margin: '8px 0' }}>──────────────────</div>
          <div style={S.grandTotal}>
            <span>ጠቅላላ</span>
            <span>ETB {parseFloat(order.total).toFixed(0)}</span>
          </div>
        </div>

        <div style={{ ...S.divider, margin: '14px 0' }}>- - - - - - - - - - - - - - - - - -</div>

        {/* Footer */}
        <div style={S.footer}>
          <div style={S.thankYou}>እናመሰግናለን! 🙏</div>
          <div style={S.thankYouSub}>እንደገና ይምጡ</div>
          <div style={{ ...S.divider, margin: '10px 0' }}>- - - - - - - - - - - - - - - - - -</div>
          <div style={S.poweredBy}>Powered by Tsdi Coffee POS</div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; margin: 0; }
        }
      `}</style>
    </div>
  );
}

const S = {
  page: {
    minHeight: '100vh',
    background: '#F3F4F6',
    fontFamily: "'Noto Sans Ethiopic', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
  },
  loading: {
    marginTop: 80,
    fontSize: 16,
    color: '#6B7280',
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    background: 'none',
    border: '1px solid #D1D5DB',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
    color: '#374151',
  },
  screenshotBtn: {
    background: '#3D1F0A',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
    color: '#F5ECD7',
  },
  printBtn: {
    background: '#6B3A1F',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    cursor: 'pointer',
    color: '#F5ECD7',
  },
  receipt: {
    background: '#fff',
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    padding: '24px 20px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
    fontFamily: "'Courier New', 'Noto Sans Ethiopic', monospace",
  },
  header: {
    textAlign: 'center',
    marginBottom: 8,
  },
  logo: {
    fontSize: 40,
    marginBottom: 4,
  },
  brandName: {
    fontSize: 20,
    fontWeight: 700,
    color: '#3D1F0A',
    letterSpacing: 1,
  },
  brandSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    fontFamily: "'Noto Sans Ethiopic', sans-serif",
  },
  receiptTitle: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 2,
    color: '#3D1F0A',
    margin: '10px 0',
  },
  divider: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 12,
    letterSpacing: 1,
  },
  infoSection: {
    margin: '10px 0',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    padding: '3px 0',
    fontFamily: "'Noto Sans Ethiopic', sans-serif",
  },
  infoLabel: {
    color: '#6B7280',
  },
  infoValue: {
    color: '#111827',
    fontWeight: 500,
  },
  itemsSection: {
    margin: '8px 0',
  },
  itemsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#6B7280',
    fontFamily: "'Noto Sans Ethiopic', sans-serif",
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 13,
    padding: '4px 0',
    fontFamily: "'Noto Sans Ethiopic', sans-serif",
  },
  itemName: {
    flex: 1,
    color: '#111827',
  },
  itemQty: {
    width: 30,
    textAlign: 'center',
    color: '#6B7280',
  },
  itemPrice: {
    width: 70,
    textAlign: 'right',
    color: '#111827',
    fontWeight: 500,
  },
  totalsSection: {
    margin: '8px 0',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    padding: '3px 0',
    color: '#374151',
    fontFamily: "'Noto Sans Ethiopic', sans-serif",
  },
  grandTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 16,
    fontWeight: 700,
    color: '#3D1F0A',
    fontFamily: "'Noto Sans Ethiopic', sans-serif",
  },
  footer: {
    textAlign: 'center',
  },
  thankYou: {
    fontSize: 18,
    fontWeight: 700,
    color: '#3D1F0A',
    fontFamily: "'Noto Sans Ethiopic', sans-serif",
  },
  thankYouSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontFamily: "'Noto Sans Ethiopic', sans-serif",
  },
  poweredBy: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
};
