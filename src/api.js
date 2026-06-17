import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

export const getMenu = () => api.get('/menu');
export const createOrder = (data) => api.post('/orders', data);
export const getOrder = (id) => api.get(`/orders/${id}`);
export const initiatePayment = (data) => api.post('/payments/initiate', data);
export const getPaymentStatus = (id) => api.get(`/payments/${id}/status`);