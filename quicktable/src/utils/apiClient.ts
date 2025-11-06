const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || '/api';

/**
 * Centralized API request handler with timeout and error handling
 * Routes all requests through the API Gateway proxy
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const isAuthEndpoint = endpoint.includes('/auth/');
    const timeout = isAuthEndpoint ? 3000 : 10000;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText || `HTTP error! status: ${response.status}` };
      }
      
      const error = new Error(errorData.error || errorData.message || `HTTP error! status: ${response.status}`);
      (error as any).status = response.status;
      (error as any).error = errorData.error;
      throw error;
    }

    return response.json();
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        const timeoutError = new Error('Request timeout - service may be unavailable');
        (timeoutError as any).status = 504;
        (timeoutError as any).error = 'Gateway Timeout';
        throw timeoutError;
      }
      throw fetchError;
    }
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const networkError = new Error('Nie można połączyć się z serwerem. Upewnij się, że wszystkie serwisy są uruchomione (npm run services:dev).');
      (networkError as any).status = 504;
      (networkError as any).error = 'Network error';
      throw networkError;
    }
    if (error.status === 504 || error.message?.includes('timeout') || error.message?.includes('Gateway')) {
      const gatewayError = new Error('Serwisy nie odpowiadają. Upewnij się, że API Gateway i wszystkie mikroserwisy są uruchomione.');
      (gatewayError as any).status = 504;
      (gatewayError as any).error = 'Gateway Timeout';
      throw gatewayError;
    }
    throw error;
  }
}

export const orderAPI = {
  getAll: (params?: { status?: string; tableId?: string; dataState?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.tableId) queryParams.append('tableId', params.tableId);
    if (params?.dataState) queryParams.append('dataState', params.dataState.toString());
    
    const query = queryParams.toString();
    return request(`/orders${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => request(`/orders/${id}`),

  create: (data: { tableId: string; items: Array<{ id: string; name: string; price: number; quantity: number }>; waiterName?: string }) =>
    request('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{ status: string; items: any[]; waiterName: string }>) =>
    request(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: 'pending' | 'completed' | 'done') =>
    request(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  archive: (id: string) =>
    request(`/orders/${id}`, {
      method: 'DELETE',
    }),
};

export const reservationAPI = {
  getAll: (params?: { tableId?: string; date?: string; status?: string; dataState?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.tableId) queryParams.append('tableId', params.tableId);
    if (params?.date) queryParams.append('date', params.date);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.dataState) queryParams.append('dataState', params.dataState.toString());
    
    const query = queryParams.toString();
    return request(`/reservations${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => request(`/reservations/${id}`),

  checkAvailability: (tableId: string, date: string, time: string) =>
    request(`/reservations/availability/check?tableId=${tableId}&date=${date}&time=${time}`),

  create: (data: {
    tableId: string;
    tableNumber: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    guests: number;
    reservationDate: string;
    reservationHour: string;
    notes?: string;
  }) =>
    request('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<any>) =>
    request(`/reservations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: 'pending' | 'accepted' | 'rejected' | 'cancelled') =>
    request(`/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  archive: (id: string) =>
    request(`/reservations/${id}`, {
      method: 'DELETE',
    }),
};

export const tableAPI = {
  getAll: (params?: { status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    
    const query = queryParams.toString();
    return request(`/tables${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => request(`/tables/${id}`),

  create: (data: { number: number }) =>
    request('/tables', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{ status: string; customerName: string | null; number: number }>) =>
    request(`/tables/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: 'free' | 'occupied', customerName?: string | null) =>
    request(`/tables/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, customerName }),
    }),

  delete: (id: string) =>
    request(`/tables/${id}`, {
      method: 'DELETE',
    }),
};

export const menuAPI = {
  getAll: () => request('/menu'),

  getById: (id: string) => request(`/menu/${id}`),

  create: (data: { name: string; price: number; ingredients: string[] }) =>
    request('/menu', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<{ name: string; price: number; ingredients: string[] }>) =>
    request(`/menu/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request(`/menu/${id}`, {
      method: 'DELETE',
    }),
};

export const hoursAPI = {
  getAll: (params?: { date?: string; dayOfWeek?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.date) queryParams.append('date', params.date);
    if (params?.dayOfWeek !== undefined) queryParams.append('dayOfWeek', params.dayOfWeek.toString());
    
    const query = queryParams.toString();
    return request(`/hours${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => request(`/hours/${id}`),

  create: (data: {
    date: string;
    dayName?: string;
    dayOfWeek?: number;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
    blockedHours?: string[];
  }) =>
    request('/hours', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<any>) =>
    request(`/hours/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  updateBlockedHours: (id: string, blockedHours: string[]) =>
    request(`/hours/${id}/blocked`, {
      method: 'PATCH',
      body: JSON.stringify({ blockedHours }),
    }),

  delete: (id: string) =>
    request(`/hours/${id}`, {
      method: 'DELETE',
    }),
};

export const notificationAPI = {
  sendEmail: (data: {
    to: string;
    type: 'reservation-confirmation' | 'reservation-accepted' | 'reservation-rejected';
    data: { reservation: any };
  }) =>
    request('/notifications/email', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const realtimeAPI = {
  emitOrderUpdate: (data: { orderId: string; action: string; data: any }) =>
    request('/realtime/events/order', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  emitTableUpdate: (data: { tableId: string; action: string; data: any }) =>
    request('/realtime/events/table', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  emitReservationUpdate: (data: { reservationId: string; action: string; data: any }) =>
    request('/realtime/events/reservation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  emitMenuUpdate: (data: { menuItemId?: string; action: string; data: any }) =>
    request('/realtime/events/menu', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const authAPI = {
  login: (data: { idToken?: string; email?: string; password?: string }) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: { email: string; password: string; displayName?: string; role?: string }) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  verifyToken: (idToken: string) =>
    request('/auth/verify-token', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  getUser: (uid: string) =>
    request(`/auth/user/${uid}`),

  updateUser: (uid: string, data: { displayName?: string; role?: string; photoURL?: string }) =>
    request(`/auth/user/${uid}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  createTestAccounts: () =>
    request('/auth/create-test-accounts', {
      method: 'POST',
    }),
};

