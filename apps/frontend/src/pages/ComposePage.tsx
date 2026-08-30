import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { FileUpload } from '../components/FileUpload';
import { campaignApi } from '../services/api';
import { showSuccess, showError } from '../components/Toast';
import { useAuth } from '../hooks/useAuth';
import { Mail } from 'lucide-react';

export const ComposePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const senderAccounts = user?.senderAccounts || [];
  const [senderId, setSenderId] = useState(senderAccounts[0]?.id || '');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [manualRecipients, setManualRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delay, setDelay] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('200');
  const [startAt, setStartAt] = useState(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update senderId when senderAccounts load
  React.useEffect(() => {
    if (senderAccounts.length > 0 && !senderId) {
      setSenderId(senderAccounts[0].id);
    }
  }, [senderAccounts, senderId]);

  const getFinalRecipients = () => {
    const manualList = manualRecipients
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0 && e.includes('@'));
    
    return Array.from(new Set([...recipients, ...manualList]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalRecipients = getFinalRecipients();
    
    if (finalRecipients.length === 0) {
      showError('Please add at least one valid recipient');
      return;
    }
    
    if (!subject.trim()) {
      showError('Subject is required');
      return;
    }
    
    if (!body.trim()) {
      showError('Email body is required');
      return;
    }

    if (!senderId) {
      showError('Please select a sender account');
      return;
    }

    const startDate = new Date(startAt);
    if (startDate <= new Date()) {
      showError('Start time must be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await campaignApi.createCampaign({
        senderId,
        subject,
        body,
        recipients: finalRecipients,
        startAt: startDate.toISOString(),
        delayBetweenEmails: parseInt(delay) || 2,
        hourlyLimit: parseInt(hourlyLimit) || 200,
      });

      if (response.data.success) {
        showSuccess(`Successfully scheduled ${finalRecipients.length} emails`);
        navigate('/dashboard/scheduled');
      } else {
        showError(response.data.error || 'Failed to create campaign');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'An error occurred while scheduling emails';
      showError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finalCount = getFinalRecipients().length;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Compose Campaign</h1>
        <p className="mt-1 text-sm text-gray-500">Set up a new email campaign to be scheduled and sent automatically.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Sender Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={senderId}
                onChange={(e) => setSenderId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              >
                {senderAccounts.length === 0 && (
                  <option value="">No sender accounts available</option>
                )}
                {senderAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName} ({account.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
            <div className="space-y-4">
              <FileUpload onSuccess={(emails) => setRecipients(emails)} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-2 text-sm text-gray-500">OR</span>
                </div>
              </div>
              <Input
                placeholder="Comma separated emails (e.g., test@example.com, john@doe.com)"
                value={manualRecipients}
                onChange={(e) => setManualRecipients(e.target.value)}
              />
              {finalCount > 0 && (
                <p className="text-sm font-medium text-brand-600 bg-brand-50 inline-block px-3 py-1 rounded-full">
                  {finalCount} recipient{finalCount !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <Input
              label="Subject"
              placeholder="Email Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message Body</label>
            <textarea
              rows={8}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-y"
              placeholder="Write your email here..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </div>

          <div className="border-t border-gray-200 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input
              type="datetime-local"
              label="Start At"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Delay between emails (sec)"
              min="0"
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              required
            />
            <Input
              type="number"
              label="Hourly Limit"
              min="1"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              required
            />
          </div>

          <div className="border-t border-gray-200 pt-6 flex justify-end">
            <Button 
              type="button" 
              variant="secondary" 
              className="mr-4"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Schedule Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
