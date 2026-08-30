import React, { useState } from 'react';
import { emailApi } from '../services/api';
import { EmailDto } from '../types';
import { SearchBar } from '../components/SearchBar';
import { EmailTable } from '../components/EmailTable';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { Search as SearchIcon } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [emails, setEmails] = useState<EmailDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setEmails([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const response = await emailApi.searchEmails(query);
      if (response.data.success && response.data.data) {
        setEmails(response.data.data);
      }
    } catch (error) {
      console.error('Failed to search emails', error);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Search Emails</h1>
        <SearchBar 
          onSearch={handleSearch} 
          placeholder="Search by recipient or subject..." 
          className="max-w-xl"
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <LoadingSpinner />
        ) : !searched ? (
          <EmptyState 
            title="Search for emails" 
            description="Enter a query above to search through all your scheduled and sent emails."
            icon={<SearchIcon className="w-12 h-12 text-gray-300" />}
          />
        ) : emails.length === 0 ? (
          <EmptyState 
            title="No results found" 
            description="Try adjusting your search terms."
          />
        ) : (
          <div>
            <p className="text-sm text-gray-500 mb-4">Found {emails.length} results</p>
            <EmailTable emails={emails} type="sent" />
          </div>
        )}
      </div>
    </div>
  );
};
