import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3007;

// Store connected clients
const clients = new Map();

io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  // Join a room (e.g., 'kitchen', 'waiter', 'admin')
  socket.on('join-room', (room) => {
    socket.join(room);
    clients.set(socket.id, { room, connectedAt: new Date() });
    console.log(`Client ${socket.id} joined room: ${room}`);
  });
  
  // Leave a room
  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`Client ${socket.id} left room: ${room}`);
  });
  
  // Handle order updates
  socket.on('order-updated', (data) => {
    // Broadcast to kitchen room
    io.to('kitchen').emit('order-update', data);
    // Broadcast to waiter room
    io.to('waiter').emit('order-update', data);
    console.log(`Order update broadcasted: ${data.orderId}`);
  });
  
  // Handle table status updates
  socket.on('table-updated', (data) => {
    // Broadcast to all waiter and admin rooms
    io.to('waiter').emit('table-update', data);
    io.to('admin').emit('table-update', data);
    console.log(`Table update broadcasted: ${data.tableId}`);
  });
  
  // Handle reservation updates
  socket.on('reservation-updated', (data) => {
    // Broadcast to waiter and admin rooms
    io.to('waiter').emit('reservation-update', data);
    io.to('admin').emit('reservation-update', data);
    console.log(`Reservation update broadcasted: ${data.reservationId}`);
  });
  
  // Handle menu updates
  socket.on('menu-updated', (data) => {
    // Broadcast to all clients
    io.emit('menu-update', data);
    console.log(`Menu update broadcasted: ${data.menuItemId || 'all'}`);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    clients.delete(socket.id);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// REST endpoints for services to emit events
app.post('/events/order', (req, res) => {
  const { orderId, action, data } = req.body;
  io.emit('order-update', { orderId, action, data, timestamp: new Date() });
  res.json({ success: true });
});

app.post('/events/table', (req, res) => {
  const { tableId, action, data } = req.body;
  io.emit('table-update', { tableId, action, data, timestamp: new Date() });
  res.json({ success: true });
});

app.post('/events/reservation', (req, res) => {
  const { reservationId, action, data } = req.body;
  io.emit('reservation-update', { reservationId, action, data, timestamp: new Date() });
  res.json({ success: true });
});

app.post('/events/menu', (req, res) => {
  const { menuItemId, action, data } = req.body;
  io.emit('menu-update', { menuItemId, action, data, timestamp: new Date() });
  res.json({ success: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'realtime-service',
    connectedClients: clients.size
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Real-time Service running on port ${PORT}`);
  console.log(`📡 WebSocket server ready for connections`);
});



