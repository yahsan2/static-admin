import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';
import { Header } from '../layout/Header';

export function CollectionListPage() {
  const { collections } = useConfig();

  return (
    <div>
      <Header title="Dashboard" />

      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Collections</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Link
              key={col.name}
              to={`/collections/${col.name}`}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{col.label}</h3>
                  {col.description && (
                    <p className="text-sm text-gray-500">{col.description}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          ))}
        </div>

        {collections.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No collections configured.
          </p>
        )}
      </div>
    </div>
  );
}
