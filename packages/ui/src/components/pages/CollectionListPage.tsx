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
        <h2 className="text-lg font-medium mb-4">Collections</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Link
              key={col.name}
              to={`/collections/${col.name}`}
              className="card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition-all"
            >
              <div className="card-body flex-row items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-base-200 rounded-lg">
                    <FileText className="w-5 h-5 text-base-content/70" />
                  </div>
                  <div>
                    <h3 className="font-medium">{col.label}</h3>
                    {col.description && (
                      <p className="text-sm text-base-content/70">{col.description}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-base-content/50" />
              </div>
            </Link>
          ))}
        </div>

        {collections.length === 0 && (
          <p className="text-base-content/70 text-center py-8">
            No collections configured.
          </p>
        )}
      </div>
    </div>
  );
}
