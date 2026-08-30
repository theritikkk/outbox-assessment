import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AuthCallback: React.FC = () => {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      await refreshUser();
      navigate('/dashboard', { replace: true });
    };

    handleCallback();
  }, [refreshUser, navigate]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-50">
      <LoadingSpinner />
      <p className="mt-4 text-gray-600">Completing login...</p>
    </div>
  );
};
