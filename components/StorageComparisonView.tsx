'use client';

import React from 'react';
import { StorageComparisonResult } from '@/lib/costCalculator';

interface StorageComparisonViewProps {
  results: StorageComparisonResult[];
  numberOfDatabases: number;
  showAnnual: boolean;
  onToggleAnnual: () => void;
  visibleTypes: Set<string>; // Set of "storageType-replication" keys
  onSelectOption?: (storageType: string, replication: string) => void;
}

export default function StorageComparisonView({
  results,
  numberOfDatabases,
  showAnnual,
  onToggleAnnual,
  visibleTypes,
  onSelectOption,
}: StorageComparisonViewProps) {
  const multiplier = showAnnual ? 12 : 1;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getStorageTypeName = (type: string) => {
    return type === 'data-lake' ? 'Azure Data Lake Storage' : 'Azure Blob Storage';
  };

  const filteredResults = results.filter(r => {
    if (r.provider === 'aws') {
      return visibleTypes.has('aws-s3');
    } else if (r.storageType && r.replication) {
      const key = `${r.storageType}-${r.replication}`;
      return visibleTypes.has(key);
    }
    return false;
  });

  if (filteredResults.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600 text-center">No storage options selected. Use filters to show options.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Storage Cost Comparison</h2>
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

      <div className="mb-4 text-sm text-gray-600">
        Showing costs for <strong>{numberOfDatabases}</strong> database{numberOfDatabases !== 1 ? 's' : ''} 
        {' '}({showAnnual ? 'annual' : 'monthly'})
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Storage Type</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Hot Tier</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Cold Tier</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Archive Tier</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Index*</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Storage</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((result, idx) => {
              const rowKey = result.provider === 'aws' 
                ? 'aws-s3' 
                : `${result.storageType}-${result.replication}`;
              return (
              <tr 
                key={rowKey} 
                className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                  onSelectOption && result.storageType && result.replication ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''
                }`}
                onClick={() => onSelectOption && result.storageType && result.replication && onSelectOption(result.storageType, result.replication)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {result.storageType ? getStorageTypeName(result.storageType) : result.label}
                  </div>
                  {result.replication && (
                    <div className="text-xs text-gray-500">{result.replication}</div>
                  )}
                  {onSelectOption && result.storageType && result.replication && (
                    <div className="text-xs text-blue-600 mt-1">Click to select for Step 2</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(result.breakdown.hot * numberOfDatabases * multiplier)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(result.breakdown.cold * numberOfDatabases * multiplier)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(result.breakdown.archive * numberOfDatabases * multiplier)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {result.breakdown.index 
                    ? formatCurrency(result.breakdown.index * numberOfDatabases * multiplier)
                    : '-'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-blue-700">
                  {formatCurrency(result.totalForAllDatabases * multiplier)}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        *Index costs apply only to Azure Data Lake Storage (Hot and Cold tiers)
      </div>
    </div>
  );
}

