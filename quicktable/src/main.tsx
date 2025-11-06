import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ErrorPage from './pages/ErrorPage.tsx'
import HomePage from './pages/HomePage.tsx'
import WaiterPage from './pages/WaiterPage/WaiterPage.tsx'
import ClientPage from './pages/ClientsPage/ClientsPage.tsx'
import LoginPage from './pages/LoginPage/LoginPage.tsx'
import AdminPage from './pages/AdminPage/AdminPage.tsx'
import OrderPage from './pages/OrderPage/OrderPage.tsx'
import MenuPage from './pages/MenuPage/MenuPage.tsx'
import KitchenPage from './pages/KitchenPage/KitchenPage.tsx'
import ReservationPage from './pages/ReservationPage/ReservationPage.tsx'
import UserPage from './pages/UserPage/UserPage.tsx'
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <AdminPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'waiter',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager', 'waiter']}>
            <WaiterPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'client',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager', 'client']}>
            <ClientPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        path: 'order',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager', 'client']}>
            <OrderPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'menu',
        element: <MenuPage />
      },
      {
        path: 'kitchen',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'manager', 'kitchen']}>
            <KitchenPage />
          </ProtectedRoute>
        )
      },
      {
        path: 'reservation',
        element: <ReservationPage />
      },
      {
        path: 'profile',
        element: <UserPage />
      }
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
