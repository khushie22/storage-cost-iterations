'use client';

import React from 'react';
import { StorageType, ReplicationType } from '@/lib/pricing';

interface StorageFiltersProps {
  visibleTypes: Set<string>;
  onFilterChange: (key: string, visible: boolean) => void;
}

export default function StorageFilters({ visibleTypes, onFilterChange }: StorageFiltersProps) {
  const storageTypes: StorageType[] = ['data-lake', 'blob'];
  const replicationTypes: ReplicationType[] = ['LRS', 'GRS'];

  const getStorageTypeName = (type: StorageType) => {
    return type === 'data-lake' ? 'Azure Data Lake Storage' : 'Azure Blob Storage';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Filter Storage Options</h2>
      <p className="text-sm text-gray-600 mb-4">
        Select which storage options to display in the comparison view
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {storageTypes.map((storageType) => (
          <div key={storageType} className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">{getStorageTypeName(storageType)}</h3>
            <div className="space-y-2">
              {replicationTypes.map((replication) => {
                const key = `${storageType}-${replication}`;
                const isVisible = visibleTypes.has(key);
                return (
                  <label key={replication} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isVisible}
                      onChange={(e) => onFilterChange(key, e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{replication}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

