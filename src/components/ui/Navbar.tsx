import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { Truck, MessageSquare, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Navbar() {
  const user = useAuthStore((state) => state.user);
  const [showNotifications, setShowNotifications] = React.useState(false);

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Truck className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">LaneRunner</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              to="/loads" 
              className="text-gray-700 hover:text-blue-600 font-medium"
            >
              Load Board
            </Link>
            {user?.role === 'carrier' && (
              <Link 
                to="/shipments" 
                className="text-gray-700 hover:text-blue-600 font-medium"
              >
                Shipments
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link 
                  to="/messages" 
                  className="text-gray-700 hover:text-blue-600"
                  title="Messages"
                >
                  <MessageSquare className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="text-gray-700 hover:text-blue-600 relative"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    2
                  </span>
                </button>
                <div className="relative">
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Sign Out
                  </button>
                </div>
                <Link 
                  to="/profile" 
                  className="flex items-center space-x-2 text-gray-700 hover:text-blue-600"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {user.email?.[0].toUpperCase()}
                    </span>
                  </div>
                </Link>
              </>
            ) : (
              <Link
                to="/auth"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}