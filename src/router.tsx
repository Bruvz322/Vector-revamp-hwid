import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './components/layout/RootLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Cart from './pages/Cart';
import Subscriptions from './pages/Subscriptions';
import Loader from './pages/Loader';
import Announcements from './pages/Announcements';
import AdminPanel from './pages/admin/AdminPanel';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Login />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
       path: 'signup',
       element: <Signup />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'cart',
        element: <Cart />,
      },
      {
        path: 'subscriptions',
        element: <Subscriptions />,
      },
      {
        path: 'loader',
        element: <Loader />,
      },
      {
        path: 'announcements',
        element: <Announcements />,
      },
      {
        path: 'admin',
        element: <AdminPanel />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
