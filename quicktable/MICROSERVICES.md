# QuickTable Microservices Architecture

## Overview

QuickTable has been refactored into a microservices architecture with 8 independent services:

1. **API Gateway** - Single entry point for all API requests
2. **Order Service** - Order management and calculations
3. **Reservation Service** - Reservation booking and conflict checking
4. **Table Service** - Table status management
5. **Menu Service** - Menu item CRUD operations
6. **Hours Service** - Restaurant hours and time slots
7. **Notification Service** - Email notifications
8. **Real-time Service** - WebSocket for live updates

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Option 2: Local Development

```bash
# Install dependencies for all services
npm run services:install

# Start all services in development mode
npm run services:dev

# In another terminal, start the frontend
npm run dev
```

## Frontend Integration

The frontend now uses the API client utilities instead of direct Firebase calls:

### Using API Client

```typescript
import { orderAPI, tableAPI, reservationAPI } from '../utils/apiClient';

// Get all orders
const orders = await orderAPI.getAll({ status: 'pending' });

// Create an order
const newOrder = await orderAPI.create({
  tableId: 'table123',
  items: [
    { id: 'item1', name: 'Pizza', price: 25, quantity: 2 }
  ]
});

// Update order status
await orderAPI.updateStatus('order123', 'done');
```

### Using Real-time Client

```typescript
import { connectRealtime } from '../utils/realtimeClient';

useEffect(() => {
  connectRealtime({
    onOrderUpdate: (data) => {
      console.log('Order updated:', data);
      // Refresh orders
    },
    onTableUpdate: (data) => {
      console.log('Table updated:', data);
      // Refresh tables
    },
    onConnect: () => {
      console.log('Connected to real-time service');
    }
  }, 'kitchen'); // Join 'kitchen' room

  return () => {
    disconnectRealtime();
  };
}, []);
```

## Migration Guide

### Before (Direct Firebase)
```typescript
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const snapshot = await getDocs(collection(db, 'orders'));
const orders = snapshot.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

### After (Microservices API)
```typescript
import { orderAPI } from '../utils/apiClient';

const orders = await orderAPI.getAll();
```

## API Endpoints

All endpoints are available through the API Gateway at `http://localhost:3000/api`

### Orders
- `GET /api/orders` - List all orders
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id` - Update order
- `PATCH /api/orders/:id/status` - Update status
- `DELETE /api/orders/:id` - Archive order

### Reservations
- `GET /api/reservations` - List reservations
- `GET /api/reservations/availability/check` - Check availability
- `POST /api/reservations` - Create reservation
- `PATCH /api/reservations/:id/status` - Update status

### Tables
- `GET /api/tables` - List tables
- `POST /api/tables` - Create table
- `PATCH /api/tables/:id/status` - Update status

### Menu
- `GET /api/menu` - List menu items
- `POST /api/menu` - Create menu item
- `PATCH /api/menu/:id` - Update menu item

### Hours
- `GET /api/hours` - Get restaurant hours
- `POST /api/hours` - Create hours entry
- `PATCH /api/hours/:id` - Update hours

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_GATEWAY_URL=http://localhost:3000/api
VITE_REALTIME_SERVICE_URL=http://localhost:3007
```

## Service Ports

- API Gateway: 3000
- Order Service: 3001
- Reservation Service: 3002
- Table Service: 3003
- Menu Service: 3004
- Hours Service: 3005
- Notification Service: 3006
- Real-time Service: 3007

## Health Checks

Check service health:
```bash
curl http://localhost:3000/health
```

This returns the status of all services.



