import { useEffect } from 'react';
import { useAuthStore } from './stores/auth.store';
import { LoginPage } from './pages/Login';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Toaster } from './components/ui/toaster';

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      {isAuthenticated ? <DashboardLayout /> : <LoginPage />}
      <Toaster />
    </>
  );
}

export default App;
