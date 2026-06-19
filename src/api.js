import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Force every request to bypass browser/proxy caching.
// Fixes "refresh button does nothing" bugs caused by 304 Not Modified responses.
api.interceptors.request.use((config) => {
  config.headers['Cache-Control'] = 'no-cache';
  config.headers['Pragma'] = 'no-cache';
  if (config.method === 'get') {
    config.params = { ...config.params, _t: Date.now() };
  }
  return config;
});

export const getMenu = () => api.get('/menu');
export const createOrder = (data) => api.post('/orders', data);
export const getOrder = (id) => api.get(`/orders/${id}`);
export const initiatePayment = (data) => api.post('/payments/initiate', data);
export const getPaymentStatus = (id) => api.get(`/payments/${id}/status`);
