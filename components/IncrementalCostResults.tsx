'use client';

import React from 'react';
import { IncrementalCostBreakdown } from '@/lib/costCalculator';
import { StorageType, ReplicationType } from '@/lib/pricing';

interface IncrementalCostResultsProps {
  costs: IncrementalCostBreakdown;
  storageType: StorageType;
  replication: ReplicationType;
  numberOfDatabases: number;
  showAnnual: boolean;
  onToggleAnnual: () => void;
}

export default function IncrementalCostResults({
  costs,
  storageType,
  replication,
  numberOfDatabases,
  showAnnual,
  onToggleAnnual,
}: IncrementalCostResultsProps) {
  const multiplier = showAnnual ? 12 : 1;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStorageTypeName = () => {
    return storageType === 'data-lake' 
      ? 'Azure Data Lake Storage' 
      : 'Azure Blob Storage';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Incremental Costs</h2>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showAnnual}
            onChange={onToggleAnnual}
            className="mr-2"
          />
          <span className="text-sm font-medium text-gray-700">Show Annual Cost</span>
        </label>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-2">
          <strong>Storage Type:</strong> {getStorageTypeName()} ({replication})
        </div>
        <div className="text-sm text-gray-600 mb-2">
          <strong>Number of Databases:</strong> {numberOfDatabases}
        </div>
        <div className="text-3xl font-bold text-blue-700">
          {formatCurrency(costs.total * multiplier)}
          <span className="text-lg text-gray-600 ml-2">
            / {showAnnual ? 'year' : 'month'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Transactions</div>
          <div className="text-xl font-bold text-yellow-700">
            {formatCurrency(costs.transactions * multiplier)}
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Retrieval</div>
          <div className="text-xl font-bold text-orange-700">
            {formatCurrency(costs.retrieval * multiplier)}
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Query Acceleration</div>
          <div className="text-xl font-bold text-purple-700">
            {formatCurrency(costs.queryAcceleration * multiplier)}
          </div>
        </div>
      </div>
    </div>
  );
}

