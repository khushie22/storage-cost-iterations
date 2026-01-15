'use client';

import React, { useState } from 'react';
import { StorageComparisonResult, IncrementalCostBreakdown } from '@/lib/costCalculator';

interface StorageComparisonCardsProps {
  results: StorageComparisonResult[];
  numberOfDatabases: number;
  showAnnual: boolean;
  onToggleAnnual: () => void;
  visibleTypes: Set<string>;
  incrementalCosts?: Map<string, IncrementalCostBreakdown>; // Key: "storageType-replication"
}

export default function StorageComparisonCards({
  results,
  numberOfDatabases,
  showAnnual,
  onToggleAnnual,
  visibleTypes,
  incrementalCosts,
}: StorageComparisonCardsProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const multiplier = showAnnual ? 12 : 1;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };


  const toggleCard = (key: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCards(newExpanded);
  };

  const filteredResults = results.filter(r => {
    if (r.provider === 'aws') {
      return visibleTypes.has('aws-s3');
    } else {
      const key = `${r.storageType}-${r.replication}`;
      return visibleTypes.has(key);
    }
  });

  if (filteredResults.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600 text-center">No storage options selected. Use filters to show options.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          Showing <strong>{filteredResults.length}</strong> of {results.length} storage options
          {' '}for <strong>{numberOfDatabases}</strong> database{numberOfDatabases !== 1 ? 's' : ''}
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResults.map((result) => {
          const cardKey = result.provider === 'aws' 
            ? 'aws-s3' 
            : `${result.storageType}-${result.replication}`;
          const incrementalKey = result.provider === 'aws'
            ? 'aws-s3'
            : `azure-${result.storageType}-${result.replication}`;
          const isExpanded = expandedCards.has(cardKey);
          const incremental = incrementalCosts?.get(incrementalKey);
          const hasIncremental = incremental && incremental.total > 0;
          
          const storageCost = result.totalForAllDatabases * multiplier;
          const totalCost = storageCost + (incremental?.total || 0) * multiplier;

          return (
            <div
              key={cardKey}
              className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden"
            >
              <div className="p-4">
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      result.provider === 'aws' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {result.provider === 'aws' ? 'AWS' : 'Azure'}
                    </span>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {result.label}
                    </h3>
                  </div>
                  {result.provider === 'aws' && (
                    <p className="text-xs text-gray-600">
                      Hot (S3 Standard) • Cold (S3 Standard-IA) • Archive (Glacier)
                    </p>
                  )}
                  {result.provider === 'azure' && result.replication && (
                    <p className="text-sm text-gray-600">{result.replication}</p>
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-2xl font-bold text-blue-700">
                    {formatCurrency(hasIncremental ? totalCost : storageCost)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {showAnnual ? 'per year' : 'per month'}
                  </div>
                  {hasIncremental && (
                    <div className="text-xs text-gray-600 mt-1">
                      Storage: {formatCurrency(storageCost)} + Additional: {formatCurrency(incremental.total * multiplier)}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => toggleCard(cardKey)}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  {isExpanded ? 'Hide' : 'View'} Detailed Breakdown
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-700 mb-1">Storage Costs</div>
                      <div className="pl-2 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {result.provider === 'aws' ? 'Hot (S3 Standard):' : 'Hot Tier:'}
                          </span>
                          <span className="font-medium">{formatCurrency(result.breakdown.hot * numberOfDatabases * multiplier)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {result.provider === 'aws' ? 'Cold (S3 Standard-IA):' : 'Cold Tier:'}
                          </span>
                          <span className="font-medium">{formatCurrency(result.breakdown.cold * numberOfDatabases * multiplier)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            {result.provider === 'aws' ? 'Archive (Glacier):' : 'Archive Tier:'}
                          </span>
                          <span className="font-medium">{formatCurrency(result.breakdown.archive * numberOfDatabases * multiplier)}</span>
                        </div>
                        {result.breakdown.index && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Index:</span>
                            <span className="font-medium">{formatCurrency(result.breakdown.index * numberOfDatabases * multiplier)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1 border-t border-gray-300 font-semibold">
                          <span>Total Storage:</span>
                          <span>{formatCurrency(storageCost)}</span>
                        </div>
                      </div>
                    </div>

                    {hasIncremental && incremental && (
                      <div>
                        <div className="font-medium text-gray-700 mb-1">Additional Costs</div>
                        <div className="pl-2 space-y-1 text-xs">
                          {result.provider === 'aws' ? (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Requests:</span>
                                <span className="font-medium">{formatCurrency((incremental.requests || incremental.transactions) * multiplier)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Retrieval:</span>
                                <span className="font-medium">{formatCurrency(incremental.retrieval * multiplier)}</span>
                              </div>
                              {incremental.earlyDeletion && incremental.earlyDeletion > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Early Deletion:</span>
                                  <span className="font-medium">{formatCurrency(incremental.earlyDeletion * multiplier)}</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Transactions:</span>
                                <span className="font-medium">{formatCurrency(incremental.transactions * multiplier)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Retrieval:</span>
                                <span className="font-medium">{formatCurrency(incremental.retrieval * multiplier)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Query Acceleration:</span>
                                <span className="font-medium">{formatCurrency(incremental.queryAcceleration * multiplier)}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between pt-1 border-t border-gray-300 font-semibold">
                            <span>Total Additional:</span>
                            <span>{formatCurrency(incremental.total * multiplier)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {!hasIncremental && (
                      <div className="text-xs text-gray-500 italic">
                        Enter additional cost parameters to see transaction and retrieval costs
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

