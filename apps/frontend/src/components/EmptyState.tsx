import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  description, 
  icon = <Inbox className="w-12 h-12 text-gray-400" /> 
}) => {
  return (
    <div className="flex flex-col items-center justify-center w-full py-12 text-center bg-white border border-gray-200 rounded-lg border-dashed">
      <div className="mb-4">
        {icon}
      </div>
      <h3 className="mb-1 text-lg font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
};
