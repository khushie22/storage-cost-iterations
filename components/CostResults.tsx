'use client';

import React, { useState } from 'react';
import { AggregateCosts } from '@/lib/costCalculator';
import { StorageType, ReplicationType } from '@/lib/pricing';

interface CostResultsProps {
  costs: AggregateCosts;
  storageType: StorageType;
  replication: ReplicationType;
  showAnnual: boolean;
  onToggleAnnual: () => void;
}

export default function CostResults({
  costs,
  storageType,
  replication,
  showAnnual,
  onToggleAnnual,
}: CostResultsProps) {
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());

  const toggleDatabase = (dbId: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(dbId)) {
      newExpanded.delete(dbId);
    } else {
      newExpanded.add(dbId);
    }
    setExpandedDatabases(newExpanded);
  };

  const multiplier = showAnnual ? 12 : 1;
  const totalCost = costs.totalMonthly * multiplier;

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
        <h2 className="text-2xl font-bold text-gray-800">Cost Results</h2>
        <div className="flex items-center gap-4">
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
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="text-sm text-gray-600 mb-2">
          <strong>Storage Type:</strong> {getStorageTypeName()} ({replication})
        </div>
        <div className="text-3xl font-bold text-blue-700">
          {formatCurrency(totalCost)}
          <span className="text-lg text-gray-600 ml-2">
            / {showAnnual ? 'year' : 'month'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Hot Tier</div>
          <div className="text-xl font-bold text-red-700">
            {formatCurrency(costs.byTier.hot * multiplier)}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Cold Tier</div>
          <div className="text-xl font-bold text-yellow-700">
            {formatCurrency(costs.byTier.cold * multiplier)}
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Archive Tier</div>
          <div className="text-xl font-bold text-purple-700">
            {formatCurrency(costs.byTier.archive * multiplier)}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Per-Database Breakdown</h3>
        <div className="space-y-2">
          {costs.byDatabase.map((dbCost) => (
            <div key={dbCost.databaseId} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleDatabase(dbCost.databaseId)}
                className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-800">
                  Database {dbCost.databaseId}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(dbCost.total * multiplier)}
                  </span>
                  <span className="text-gray-400">
                    {expandedDatabases.has(dbCost.databaseId) ? '▼' : '▶'}
                  </span>
                </div>
              </button>

              {expandedDatabases.has(dbCost.databaseId) && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {(['hot', 'cold', 'archive'] as const).map((tier) => (
                      <div key={tier} className="bg-white p-3 rounded border border-gray-200">
                        <div className="text-sm font-medium text-gray-700 mb-2 capitalize">
                          {tier} Tier
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Storage:</span>
                            <span className="font-medium">
                              {formatCurrency(dbCost[tier].storage * multiplier)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Transactions:</span>
                            <span className="font-medium">
                              {formatCurrency(dbCost[tier].transactions * multiplier)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Retrieval:</span>
                            <span className="font-medium">
                              {formatCurrency(dbCost[tier].retrieval * multiplier)}
                            </span>
                          </div>
                          {dbCost[tier].queryAcceleration !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Query Accel:</span>
                              <span className="font-medium">
                                {formatCurrency(dbCost[tier].queryAcceleration! * multiplier)}
                              </span>
                            </div>
                          )}
                          {dbCost[tier].index !== undefined && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Index:</span>
                              <span className="font-medium">
                                {formatCurrency(dbCost[tier].index! * multiplier)}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-gray-200 mt-1">
                            <span className="font-medium text-gray-800">Total:</span>
                            <span className="font-bold text-gray-900">
                              {formatCurrency(dbCost[tier].total * multiplier)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



