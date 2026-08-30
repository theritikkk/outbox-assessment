import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Clock, CheckCircle, Plus, LogOut, MessageSquare, Search } from 'lucide-react';
import { Button } from '../components/Button';
import { Avatar } from '../components/Avatar';
import { slackApi } from '../services/api';
import { SlackStatusDto } from '../types';
import { showSuccess, showError } from '../components/Toast';

export const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [slackStatus, setSlackStatus] = useState<SlackStatusDto | null>(null);

  const fetchSlackStatus = async () => {
    try {
      const response = await slackApi.getSlackStatus();
      if (response.data.success && response.data.data) {
        setSlackStatus(response.data.data);
      }
    } catch {
      // Gracefully ignore error if backend/slack is not available yet
    }
  };

  useEffect(() => {
    fetchSlackStatus();

    // Check query params for Slack OAuth return
    const params = new URLSearchParams(location.search);
    if (params.get('slack') === 'connected') {
      showSuccess('Slack connected successfully!');
      fetchSlackStatus();
      navigate(location.pathname, { replace: true });
    } else if (params.get('error')) {
      showError(`Slack connection failed: ${params.get('error')}`);
      navigate(location.pathname, { replace: true });
    }
  }, [location.search]);

  const handleSlackConnect = () => {
    window.location.href = '/api/slack/connect';
  };

  const handleSlackDisconnect = async () => {
    try {
      await slackApi.disconnectSlack();
      setSlackStatus({ connected: false });
      showSuccess('Slack disconnected successfully');
    } catch {
      showError('Failed to disconnect Slack');
    }
  };

  const navItems = [
    { name: 'Scheduled', path: '/dashboard/scheduled', icon: <Clock className="w-5 h-5 mr-3" /> },
    { name: 'Sent', path: '/dashboard/sent', icon: <CheckCircle className="w-5 h-5 mr-3" /> },
    { name: 'Search', path: '/dashboard/search', icon: <Search className="w-5 h-5 mr-3" /> },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <span className="text-brand-600 mr-2">Reach</span>Inbox
          </h1>
        </div>

        <div className="px-4 mb-6">
          <Button 
            className="w-full justify-start" 
            leftIcon={<Plus className="w-5 h-5" />}
            onClick={() => navigate('/dashboard/compose')}
            variant="primary"
          >
            Compose
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Integrations</h3>
            {slackStatus?.connected ? (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <div className="flex items-center truncate">
                  <MessageSquare className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 truncate">{slackStatus.teamName || 'Slack'}</span>
                </div>
                <button 
                  onClick={handleSlackDisconnect} 
                  className="text-xs text-red-600 hover:text-red-800 ml-2 flex-shrink-0 font-medium"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleSlackConnect}
                className="flex items-center w-full p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <MessageSquare className="w-4 h-4 mr-2 text-gray-500" />
                Connect Slack
              </button>
            )}
          </div>

          <div className="flex items-center mb-4">
            <Avatar url={user?.avatarUrl} name={user?.name || 'User'} size="sm" />
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          <button 
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 text-gray-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};
