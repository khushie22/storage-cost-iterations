'use client';

import React from 'react';
import { StorageType, ReplicationType } from '@/lib/pricing';

interface DatabaseConfigProps {
  storageType: StorageType;
  replication: ReplicationType;
  numberOfDatabases: number;
  onStorageTypeChange: (type: StorageType) => void;
  onReplicationChange: (replication: ReplicationType) => void;
  onNumberOfDatabasesChange: (count: number) => void;
}

export default function DatabaseConfig({
  storageType,
  replication,
  numberOfDatabases,
  onStorageTypeChange,
  onReplicationChange,
  onNumberOfDatabasesChange,
}: DatabaseConfigProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Database Configuration</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Storage Type
          </label>
          <select
            value={storageType}
            onChange={(e) => onStorageTypeChange(e.target.value as StorageType)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="data-lake">Azure Data Lake Storage</option>
            <option value="blob">Azure Blob Storage</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Replication
          </label>
          <select
            value={replication}
            onChange={(e) => onReplicationChange(e.target.value as ReplicationType)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="LRS">LRS (Locally Redundant Storage)</option>
            <option value="GRS">GRS (Geo-Redundant Storage)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Databases (1-75)
          </label>
          <input
            type="number"
            min="1"
            max="75"
            value={numberOfDatabases}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              onNumberOfDatabasesChange(Math.max(1, Math.min(75, value)));
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}



