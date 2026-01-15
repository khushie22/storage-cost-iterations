'use client';

import React, { useState } from 'react';
import { StorageComparisonResult, IncrementalCostBreakdown } from '@/lib/costCalculator';
import { TierAllocation, TransactionInputs, AWSTransactionInputs } from '@/lib/types';
import { generateFlowchartWithValues } from '@/lib/flowchartGenerator';
import FlowchartModal from './FlowchartModal';

interface StorageComparisonCardsProps {
  results: StorageComparisonResult[];
  numberOfDatabases: number;
  showAnnual: boolean;
  onToggleAnnual: () => void;
  visibleTypes: Set<string>;
  incrementalCosts?: Map<string, IncrementalCostBreakdown>; // Key: "storageType-replication"
  hasData: boolean; // Whether we have sufficient data to calculate costs
  tierAllocation: TierAllocation;
  transactions?: TransactionInputs;
  awsTransactions?: AWSTransactionInputs;
}

interface CardData {
  key: string;
  provider: 'azure' | 'aws';
  label: string;
  replication?: string;
  awsDescription?: string;
  result?: StorageComparisonResult;
}

export default function StorageComparisonCards({
  results,
  numberOfDatabases,
  showAnnual,
  onToggleAnnual,
  visibleTypes,
  incrementalCosts,
  hasData,
  tierAllocation,
  transactions,
  awsTransactions,
}: StorageComparisonCardsProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [flowchartModal, setFlowchartModal] = useState<{
    isOpen: boolean;
    flowchartCode: string;
    title: string;
  }>({
    isOpen: false,
    flowchartCode: '',
    title: '',
  });
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

  const handleVisualize = (card: CardData) => {
    if (!card.result) return;

    const key = card.provider === 'aws' 
      ? 'aws-s3' 
      : `azure-${card.result.storageType}-${card.result.replication}`;
    
    const incremental = incrementalCosts?.get(key);
    
    const flowchartCode = generateFlowchartWithValues({
      storageResult: card.result,
      incrementalCosts: incremental,
      tierAllocation,
      transactions,
      awsTransactions,
      numberOfDatabases,
    });

    setFlowchartModal({
      isOpen: true,
      flowchartCode,
      title: card.label + (card.replication ? ` (${card.replication})` : ''),
    });
  };

  // Create card data for all visible types
  const getCardData = (): CardData[] => {
    const cards: CardData[] = [];
    
    // Azure Data Lake Storage
    if (visibleTypes.has('data-lake-LRS')) {
      const result = results.find(r => r.storageType === 'data-lake' && r.replication === 'LRS');
      cards.push({
        key: 'data-lake-LRS',
        provider: 'azure',
        label: 'Azure Data Lake Storage',
        replication: 'LRS',
        result,
      });
    }
    if (visibleTypes.has('data-lake-GRS')) {
      const result = results.find(r => r.storageType === 'data-lake' && r.replication === 'GRS');
      cards.push({
        key: 'data-lake-GRS',
        provider: 'azure',
        label: 'Azure Data Lake Storage',
        replication: 'GRS',
        result,
      });
    }
    
    // Azure Blob Storage
    if (visibleTypes.has('blob-LRS')) {
      const result = results.find(r => r.storageType === 'blob' && r.replication === 'LRS');
      cards.push({
        key: 'blob-LRS',
        provider: 'azure',
        label: 'Azure Blob Storage',
        replication: 'LRS',
        result,
      });
    }
    if (visibleTypes.has('blob-GRS')) {
      const result = results.find(r => r.storageType === 'blob' && r.replication === 'GRS');
      cards.push({
        key: 'blob-GRS',
        provider: 'azure',
        label: 'Azure Blob Storage',
        replication: 'GRS',
        result,
      });
    }
    
    // AWS S3
    if (visibleTypes.has('aws-s3')) {
      const result = results.find(r => r.provider === 'aws');
      cards.push({
        key: 'aws-s3',
        provider: 'aws',
        label: 'AWS S3',
        awsDescription: 'Hot (S3 Standard) • Cold (S3 Standard-IA) • Archive (Glacier)',
        result,
      });
    }
    
    return cards;
  };

  const cardData = getCardData();

  if (cardData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-8">
        <p className="text-slate-600 text-center font-medium">No storage options selected. Use "Add Component" to show options.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="text-sm text-slate-600 font-semibold">
          Showing <strong className="text-slate-900">{cardData.length}</strong> storage option{cardData.length !== 1 ? 's' : ''}
        </div>
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={showAnnual}
            onChange={onToggleAnnual}
            className="mr-3 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Show Annual Cost</span>
        </label>
      </div>

      <div className="space-y-4">
        {/* Expanded Card - Full Width */}
        {cardData.filter(card => expandedCards.has(card.key)).map((card) => {
          const incrementalKey = card.provider === 'aws'
            ? 'aws-s3'
            : `azure-${card.key}`;
          const incremental = incrementalCosts?.get(incrementalKey);
          const hasIncremental = incremental && incremental.total > 0;
          
          const hasResult = card.result !== undefined;
          const storageCost = hasResult ? card.result.totalForAllDatabases * multiplier : 0;
          const totalCost = storageCost + (incremental?.total || 0) * multiplier;
          const showNA = !hasData || !hasResult;

          return (
            <div
              key={card.key}
              className="bg-white rounded-2xl shadow-xl border-2 border-indigo-300 overflow-hidden transition-all duration-500 ease-out relative"
            >
              {/* Diagonal Sticker */}
              <div className={`absolute top-0 left-0 w-20 h-20 overflow-hidden z-10`}>
                <div className={`absolute top-3 -left-6 w-24 h-8 transform rotate-[-35deg] ${
                  card.provider === 'aws' 
                    ? 'bg-amber-500' 
                    : 'bg-indigo-600'
                } shadow-lg flex items-center justify-center`}>
                  <span className="text-white text-[10px] font-black tracking-wider uppercase">
                    {card.provider === 'aws' ? 'AWS' : 'Azure'}
                  </span>
                </div>
              </div>

              {/* Flowchart Button - Top Right Corner */}
              {hasResult && (
                <button
                  onClick={() => handleVisualize(card)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-semibold text-xs shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center z-20 border border-slate-200 hover:border-indigo-300"
                  title="Visualize Calculation Flow"
                  aria-label="Visualize Calculation Flow"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              )}

              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 text-lg tracking-tight mb-2">
                      {card.label}
                    </h3>
                    {card.awsDescription && (
                      <p className="text-xs text-slate-600 font-medium leading-tight mb-2">
                        {card.awsDescription}
                      </p>
                    )}
                    {card.replication && (
                      <p className="text-sm text-slate-600 font-semibold">{card.replication}</p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleCard(card.key)}
                    className="ml-4 px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 border border-slate-300 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>

                {showNA ? (
                  <div className="text-[10px] text-slate-500 italic text-center py-8 font-medium">
                    Enter storage configuration to see detailed breakdown
                  </div>
                ) : hasResult ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    {/* Total Cost Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 p-4">
                      <div className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wide mb-2">
                        Total Cost
                      </div>
                      <div className="text-xl font-bold text-indigo-700 mb-1 tracking-tight">
                        {formatCurrency(hasIncremental ? totalCost : storageCost)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">
                        {showAnnual ? 'per year' : 'per month'}
                      </div>
                    </div>

                    {/* Storage Cost Card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                      <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide mb-2">
                        Storage Cost
                      </div>
                      <div className="text-xl font-bold text-slate-900 mb-1 tracking-tight">
                        {formatCurrency(storageCost)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">
                        {showAnnual ? 'per year' : 'per month'}
                      </div>
                    </div>

                    {/* Additional Cost Card */}
                    {hasIncremental && incremental ? (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="text-[10px] text-slate-600 font-semibold uppercase tracking-wide mb-2">
                          Additional Cost
                        </div>
                        <div className="text-xl font-bold text-slate-900 mb-1 tracking-tight">
                          {formatCurrency(incremental.total * multiplier)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">
                          {showAnnual ? 'per year' : 'per month'}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                        <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">
                          Additional Cost
                        </div>
                        <div className="text-[10px] text-slate-500 italic font-medium">
                          Enter additional cost parameters
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* Non-Expanded Cards - Grid Layout */}
        {cardData.filter(card => !expandedCards.has(card.key)).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 transition-all duration-500">
            {cardData.filter(card => !expandedCards.has(card.key)).map((card) => {
              const incrementalKey = card.provider === 'aws'
                ? 'aws-s3'
                : `azure-${card.key}`;
              const incremental = incrementalCosts?.get(incrementalKey);
              const hasIncremental = incremental && incremental.total > 0;
              
              const hasResult = card.result !== undefined;
              const storageCost = hasResult ? card.result.totalForAllDatabases * multiplier : 0;
              const totalCost = storageCost + (incremental?.total || 0) * multiplier;
              const showNA = !hasData || !hasResult;

              return (
                <div
                  key={card.key}
                  className="bg-white rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden hover:shadow-2xl transition-all duration-300 hover:border-indigo-300/50 relative animate-in fade-in slide-in-from-bottom-2"
                >
                  {/* Diagonal Sticker */}
                  <div className={`absolute top-0 left-0 w-20 h-20 overflow-hidden z-10`}>
                    <div className={`absolute top-3 -left-6 w-24 h-8 transform rotate-[-35deg] ${
                      card.provider === 'aws' 
                        ? 'bg-amber-500' 
                        : 'bg-indigo-600'
                    } shadow-lg flex items-center justify-center`}>
                      <span className="text-white text-[10px] font-black tracking-wider uppercase">
                        {card.provider === 'aws' ? 'AWS' : 'Azure'}
                      </span>
                    </div>
                  </div>

                  {/* Flowchart Button - Top Right Corner */}
                  {hasResult && (
                    <button
                      onClick={() => handleVisualize(card)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-indigo-600 font-semibold text-xs shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center z-20 border border-slate-200 hover:border-indigo-300"
                      title="Visualize Calculation Flow"
                      aria-label="Visualize Calculation Flow"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </button>
                  )}

                  <div className="p-4">
                    <div className="mb-3">
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight mb-1.5 pt-1">
                        {card.label}
                      </h3>
                      {card.awsDescription && (
                        <p className="text-[10px] text-slate-600 font-medium leading-tight mb-1">
                          {card.awsDescription}
                        </p>
                      )}
                      {card.replication && (
                        <p className="text-xs text-slate-600 font-semibold">{card.replication}</p>
                      )}
                    </div>

                    <div className="mb-4">
                      <div className="text-xl font-bold text-indigo-600 mb-1 tracking-tight">
                        {showNA ? 'N/A' : formatCurrency(hasIncremental ? totalCost : storageCost)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-semibold uppercase tracking-wide">
                        {showAnnual ? 'per year' : 'per month'}
                      </div>
                      {!showNA && hasIncremental && (
                        <div className="text-[10px] text-slate-600 mt-1.5 font-medium space-y-0.5">
                          <div>Storage: {formatCurrency(storageCost)}</div>
                          <div>Additional: {formatCurrency(incremental.total * multiplier)}</div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => toggleCard(card.key)}
                      className="w-full px-3 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      View Detailed Breakdown
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FlowchartModal
        isOpen={flowchartModal.isOpen}
        onClose={() => setFlowchartModal({ ...flowchartModal, isOpen: false })}
        flowchartCode={flowchartModal.flowchartCode}
        title={flowchartModal.title}
      />
    </div>
  );
}

