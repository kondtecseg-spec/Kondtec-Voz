import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import AssistantInterface from './components/AssistantInterface';

const App: React.FC = () => {
  const [user, setUser] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check for saved user on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('ksv_martins_user');
    if (savedUser) {
      setUser(savedUser);
    }
    setIsLoaded(true);
  }, []);

  const handleLogin = (username: string) => {
    localStorage.setItem('ksv_martins_user', username);
    setUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('ksv_martins_user');
    setUser(null);
  };

  if (!isLoaded) return null; // Prevent flash of login screen

  return (
    <>
      {user ? (
        <AssistantInterface userName={user} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
};

export default App;