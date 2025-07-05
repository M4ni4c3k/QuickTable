# QuickTable - Restaurant Management System

A comprehensive restaurant management system built with React, TypeScript, and Firebase. QuickTable provides real-time table management, order processing, reservation booking, and kitchen coordination for restaurants.

## Features

### 🍽️ **Order Management**
- Real-time order tracking
- Customer self-ordering interface
- Waiter order management
- Kitchen order display
- Automatic bill calculation

### 📅 **Reservation System**
- Multi-step reservation booking
- Conflict checking (2-hour window)
- Visual timeline with blocked times
- Admin reservation management
- Pending/accepted/rejected status tracking

### 🏪 **Table Management**
- Real-time table status updates
- Customer assignment tracking
- Visual table grid interface
- Status indicators (free/occupied)

### 👨‍💼 **Admin Panel**
- Restaurant hours configuration
- Reservation approval/rejection
- Menu management
- System overview and analytics

### 🍳 **Kitchen Interface**
- Real-time order display
- Order status updates
- Table grouping for efficiency
- Animated order cards

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quicktable
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a Firebase project
   - Enable Firestore Database
   - Enable Authentication
   - Copy your Firebase config

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **Run setup scripts**
   ```bash
   # Set up default restaurant hours
   node src/scripts/setup-default-hours.js
   
   # Set up reservations collection
   node src/scripts/setup-reservations-collection.js
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## Database Structure

### Collections

- **tables**: Restaurant table information and current status
- **orders**: Customer orders with items and status
- **menu**: Menu items with prices and ingredients
- **reservations**: Booking information with conflict checking
- **restaurantHours**: Operating hours for each day

### Key Features

- **Real-time updates** using Firebase onSnapshot
- **Conflict checking** for reservations (2-hour window)
- **Status tracking** for orders and reservations
- **Archive system** for completed items

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
