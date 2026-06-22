import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TABLES = ['01','02','03','04','05','06','07','08','09','VIP'];

export default function QRGenerator() {
  const [baseUrl, setBaseUrl] = useState(
    process.env.REACT_APP_FRONTEND_URL || 'https://tsdi-coffee-frontend.vercel.app'
  );
  const [selected, setSelected] = useState('01');
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);

  const handleLogin = () => {
    if (password === (process.env.REACT_APP_ADMIN_PASSWORD || 'admin123')) {
      setAuthed(true);
    } else {
      alert('Wrong password');
    }
  };

  if (!authed) {
    return (
      <div style={styles.loginWrap}>
        <div style={styles.loginCard}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
          <div style={styles.loginTitle}>QR Generator</div>
          <div style={styles.loginSub}>Admin access only</div>
          <input
            style={styles.input}
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button style={styles.loginBtn} onClick={handleLogin}>Access</button>
        </div>
      </div>
    );
  }

  const handlePrintAll = () => window.print();

  return (
    <div style={styles.page}>
      <div style={styles.header} className="no-print">
        <div>
          <div style={styles.title}>☕ QR Code Generator</div>
          <div style={styles.sub}>Tsdi Coffee — print and stick on each table</div>
        </div>
        <button style={styles.printBtn} onClick={handlePrintAll}>🖨 Print All</button>
      </div>

      {/* Base URL config */}
      <div style={styles.urlBar} className="no-print">
        <label style={{ fontSize: 13, color: '#6B7280', marginRight: 10 }}>Your app URL:</label>
        <input
          style={{ ...styles.input, flex: 1, marginBottom: 0 }}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://tsdi-coffee-frontend.vercel.app"
        />
        <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>
          Change to your Vercel URL when deployed
        </span>
      </div>

      {/* QR Grid */}
      <div style={styles.grid}>
        {TABLES.map((table) => {
          const url = `${baseUrl}/menu?table=${table}`;
          return (
            <div key={table} style={styles.qrCard} className="qr-card">
              <div style={styles.coffeeName}>Tsdi Coffee</div>
              <div style={styles.tableLabel}>Table {table}</div>
              <div style={styles.qrWrap}>
                <QRCodeSVG
                  value={url}
                  size={160}
                  fgColor="#3D1F0A"
                  bgColor="#FDF6ED"
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div style={styles.scanText}>📱 Scan to order</div>
              <div style={styles.urlText}>{url}</div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .qr-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { background: '#3D1F0A', color: '#F5ECD7', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: 700 },
  sub: { fontSize: 13, color: '#C49A6C', marginTop: 2 },
  printBtn: { background: '#C49A6C', border: 'none', color: '#3D1F0A', padding: '10px 20px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 14 },
  urlBar: { display: 'flex', alignItems: 'center', padding: '14px 28px', background: '#fff', borderBottom: '1px solid #E5E7EB' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, padding: 28 },
  qrCard: { background: '#FDF6ED', border: '2px solid #C49A6C', borderRadius: 16, padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  coffeeName: { fontSize: 16, fontWeight: 700, color: '#3D1F0A', marginBottom: 2 },
  tableLabel: { fontSize: 22, fontWeight: 700, color: '#6B3A1F', marginBottom: 12 },
  qrWrap: { background: '#FDF6ED', borderRadius: 12, padding: 4, marginBottom: 10 },
  scanText: { fontSize: 13, fontWeight: 600, color: '#3D1F0A', marginBottom: 6 },
  urlText: { fontSize: 9, color: '#9CA3AF', wordBreak: 'break-all' },
  loginWrap: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6' },
  loginCard: { background: '#fff', borderRadius: 16, padding: 36, width: 300, textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' },
  loginTitle: { fontSize: 20, fontWeight: 700, color: '#3D1F0A' },
  loginSub: { fontSize: 13, color: '#6B7280', marginBottom: 20 },
  input: { width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, marginBottom: 12, outline: 'none', boxSizing: 'border-box' },
  loginBtn: { width: '100%', padding: 12, background: '#3D1F0A', color: '#fff', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' },
};
