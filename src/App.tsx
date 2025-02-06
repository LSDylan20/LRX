import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { supabase } from './lib/supabase';
import { useAuthStore } from './lib/store';
import Navbar from './components/ui/Navbar';
import Dashboard from './pages/Dashboard';
import LoadBoard from './pages/LoadBoard';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import ShipmentTracking from './pages/ShipmentTracking';
import NotificationCenter from './features/messages/components/NotificationCenter';

function App() {
  const { setUser } = useAuthStore();

  useEffect(() => {
    // Set up auth state listener
    supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, [setUser]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/loads" element={<LoadBoard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/shipments/:id" element={<ShipmentTracking />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;