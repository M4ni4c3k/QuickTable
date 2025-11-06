# QuickTable Microservices

This directory contains all microservices for the QuickTable restaurant management system.

## Services

1. **API Gateway** (Port 3000) - Routes requests to appropriate services
2. **Order Service** (Port 3001) - Manages orders and calculations
3. **Reservation Service** (Port 3002) - Handles reservations and conflict checking
4. **Table Service** (Port 3003) - Manages table status and assignments
5. **Menu Service** (Port 3004) - CRUD operations for menu items
6. **Hours Service** (Port 3005) - Restaurant hours and time slot management
7. **Notification Service** (Port 3006) - Email notifications
8. **Real-time Service** (Port 3007) - WebSocket server for live updates

## Setup

### Option 1: Run with Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Option 2: Run Locally

1. Install dependencies for all services:
```bash
npm run services:install
```

2. Start all services in development mode:
```bash
npm run services:dev
```

3. Or start individual services:
```bash
npm run services:start:gateway
npm run services:start:order
# etc...
```

## Environment Variables

### Notification Service
Set these environment variables for email functionality:
- `EMAIL_SERVICE` - Email service provider (default: gmail)
- `EMAIL_USER` - Email address
- `EMAIL_PASS` - Email password or app password

### API Gateway
All service URLs can be configured via environment variables:
- `ORDER_SERVICE_URL`
- `RESERVATION_SERVICE_URL`
- `TABLE_SERVICE_URL`
- `MENU_SERVICE_URL`
- `HOURS_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- `REALTIME_SERVICE_URL`

## API Endpoints

All requests go through the API Gateway at `http://localhost:3000/api`

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id` - Update order
- `PATCH /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Archive order

### Reservations
- `GET /api/reservations` - Get all reservations
- `GET /api/reservations/:id` - Get reservation by ID
- `GET /api/reservations/availability/check` - Check availability
- `POST /api/reservations` - Create reservation
- `PATCH /api/reservations/:id` - Update reservation
- `PATCH /api/reservations/:id/status` - Update reservation status
- `DELETE /api/reservations/:id` - Archive reservation

### Tables
- `GET /api/tables` - Get all tables
- `GET /api/tables/:id` - Get table by ID
- `POST /api/tables` - Create table
- `PATCH /api/tables/:id` - Update table
- `PATCH /api/tables/:id/status` - Update table status
- `DELETE /api/tables/:id` - Delete table

### Menu
- `GET /api/menu` - Get all menu items
- `GET /api/menu/:id` - Get menu item by ID
- `POST /api/menu` - Create menu item
- `PATCH /api/menu/:id` - Update menu item
- `DELETE /api/menu/:id` - Delete menu item

### Hours
- `GET /api/hours` - Get all restaurant hours
- `GET /api/hours/:id` - Get hours by ID
- `POST /api/hours` - Create hours entry
- `PATCH /api/hours/:id` - Update hours
- `PATCH /api/hours/:id/blocked` - Update blocked hours
- `DELETE /api/hours/:id` - Delete hours entry

### Notifications
- `POST /api/notifications/email` - Send email notification

### Real-time
- `POST /api/realtime/events/order` - Emit order update
- `POST /api/realtime/events/table` - Emit table update
- `POST /api/realtime/events/reservation` - Emit reservation update
- `POST /api/realtime/events/menu` - Emit menu update

## Health Checks

All services have a `/health` endpoint:
- `GET /api/orders/health`
- `GET /api/reservations/health`
- etc.

The API Gateway has a combined health check:
- `GET /health` - Shows status of all services

## Frontend Integration

The frontend uses the API client utilities in `src/utils/apiClient.ts` and `src/utils/realtimeClient.ts` to communicate with the microservices.



