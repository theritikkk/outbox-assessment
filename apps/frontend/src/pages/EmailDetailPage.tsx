import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { emailApi } from '../services/api';
import { EmailDto } from '../types';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Badge } from '../components/Badge';
import { ArrowLeft, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';

export const EmailDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [email, setEmail] = useState<EmailDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmail = async () => {
      if (!id) return;
      try {
        const response = await emailApi.getEmailById(id);
        if (response.data.success && response.data.data) {
          setEmail(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch email detail', error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmail();
  }, [id]);

  if (loading) return <LoadingSpinner />;
  
  if (!email) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Email not found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold text-gray-900 break-words">{email.subject || '(No subject)'}</h1>
            <Badge status={email.status} className="ml-4 flex-shrink-0" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <p><span className="font-medium text-gray-900">To:</span> {email.recipient}</p>
            </div>
            <div className="md:text-right">
              <p className="flex items-center md:justify-end">
                <Clock className="w-4 h-4 mr-1 text-gray-400" />
                <span className="font-medium text-gray-900 mr-1">Scheduled:</span> 
                {new Date(email.scheduledAt).toLocaleString()}
              </p>
              {email.sentAt && (
                <p className="mt-1">
                  <span className="font-medium text-gray-900 mr-1">Sent:</span> 
                  {new Date(email.sentAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 min-h-[300px]">
          <div className="whitespace-pre-wrap text-gray-800 font-sans">
            {email.body}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-4 text-xs text-gray-500">
          <div><span className="font-medium">Attempts:</span> {email.attempts}</div>
          {email.providerMessageId && (
            <div><span className="font-medium">Message ID:</span> {email.providerMessageId}</div>
          )}
          {email.errorMessage && (
            <div className="text-red-600 flex items-center w-full mt-2">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="font-medium mr-1">Error:</span> {email.errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
