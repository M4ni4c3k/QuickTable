import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import ErrorPage from './pages/ErrorPage.tsx'
import HomePage from './pages/HomePage.tsx'
import WaiterPage from './pages/WaiterPage/WaiterPage.tsx'
import ClientPage from './pages/ClientPage/ClientsPage.tsx'
import LoginPage from './pages/LoginPage/LoginPage.tsx'
import AdminPage from './pages/AdminPage/AdminPage.tsx'

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
      }
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
