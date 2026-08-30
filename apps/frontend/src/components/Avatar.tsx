import React from 'react';

interface AvatarProps {
  url?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar: React.FC<AvatarProps> = ({ url, name, size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`rounded-full object-cover ${sizes[size]}`}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-medium ${sizes[size]}`}>
      {initials}
    </div>
  );
};
