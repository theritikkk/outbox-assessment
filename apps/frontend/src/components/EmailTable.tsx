import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EmailDto } from '../types';
import { Badge } from './Badge';

interface EmailTableProps {
  emails: EmailDto[];
  type: 'scheduled' | 'sent';
}

export const EmailTable: React.FC<EmailTableProps> = ({ emails, type }) => {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {type === 'scheduled' ? 'Scheduled For' : 'Sent At'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {emails.map((email) => (
            <tr 
              key={email.id} 
              onClick={() => navigate(`/dashboard/emails/${email.id}`)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{email.recipient}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">{email.subject || '(No subject)'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(type === 'scheduled' ? email.scheduledAt : (email.sentAt || email.createdAt)).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <Badge status={email.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
