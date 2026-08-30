import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  placeholder = 'Search...', 
  className = '' 
}) => {
  const [query, setQuery] = useState('');
  const onSearchRef = React.useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchRef.current(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="w-5 h-5 text-gray-400" />
      </div>
      <input
        type="text"
        className="block w-full p-2 pl-10 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:ring-brand-500 focus:border-brand-500 outline-none transition-shadow"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </div>
  );
};
