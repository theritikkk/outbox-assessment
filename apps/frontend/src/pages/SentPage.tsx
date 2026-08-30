import React, { useEffect, useState } from 'react';
import { emailApi } from '../services/api';
import { EmailDto } from '../types';
import { EmailTable } from '../components/EmailTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { CheckCircle } from 'lucide-react';

export const SentPage: React.FC = () => {
  const [emails, setEmails] = useState<EmailDto[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmails = async () => {
    try {
      const response = await emailApi.getSentEmails();
      if (response.data.success && response.data.data) {
        setEmails(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sent emails', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sent Emails</h1>
          <p className="mt-1 text-sm text-gray-500">History of your successfully sent emails.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-2xl font-bold text-gray-900">{emails.length}</span>
          <span className="text-sm text-gray-500 ml-2">sent</span>
        </div>
      </div>

      {loading && emails.length === 0 ? (
        <LoadingSpinner />
      ) : emails.length === 0 ? (
        <EmptyState 
          title="No sent emails yet" 
          description="Emails will appear here once they have been sent."
          icon={<CheckCircle className="w-12 h-12 text-gray-400" />}
        />
      ) : (
        <EmailTable emails={emails} type="sent" />
      )}
    </div>
  );
};
