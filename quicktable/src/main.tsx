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
        element: <AdminPage />
      },
      {
        path: 'waiter',
        element: <WaiterPage />
      },
      {
        path: 'client',
        element: <ClientPage />
      },
      {
        path: 'login',
        element: <LoginPage />
      },
      {
        path: 'order',
        element: <OrderPage />
      },
      {
        path: 'menu',
        element: <MenuPage />
      },
      {
        path: 'kitchen',
        element: <KitchenPage />
      }
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
