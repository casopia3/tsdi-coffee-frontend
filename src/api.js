import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

// Bust caches with a timestamp query param only — avoids adding custom
// headers that trigger CORS preflight failures on some hosts.
api.interceptors.request.use((config) => {
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
