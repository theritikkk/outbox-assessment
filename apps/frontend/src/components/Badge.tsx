import React from 'react';
import { EmailStatus, CampaignStatus } from '../types';

interface BadgeProps {
  status: EmailStatus | CampaignStatus;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  let colorClass = 'bg-gray-100 text-gray-800';

  if (status === EmailStatus.PENDING || status === EmailStatus.QUEUED || status === CampaignStatus.DRAFT || status === CampaignStatus.SCHEDULING) {
    colorClass = 'bg-yellow-100 text-yellow-800';
  } else if (status === EmailStatus.SENDING || status === CampaignStatus.ACTIVE) {
    colorClass = 'bg-blue-100 text-blue-800';
  } else if (status === EmailStatus.SENT || status === CampaignStatus.COMPLETED) {
    colorClass = 'bg-green-100 text-green-800';
  } else if (status === EmailStatus.FAILED || status === CampaignStatus.FAILED) {
    colorClass = 'bg-red-100 text-red-800';
  } else if (status === EmailStatus.RATE_LIMITED) {
    colorClass = 'bg-orange-100 text-orange-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass} ${className}`}>
      {status.toString().toLowerCase().replace('_', ' ')}
    </span>
  );
};
