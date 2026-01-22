'use client';

import React, { useState } from 'react';
import { TransactionInputs, AWSTransactionInputs, TierTransactionInputs, AWSTierTransactionInputs } from '@/lib/costCalculator';

interface AdditionalCostParametersProps {
  transactions: TransactionInputs;
  awsTransactions: AWSTransactionInputs;
  onTransactionsChange: (transactions: TransactionInputs) => void;
  onAWSTransactionsChange: (transactions: AWSTransactionInputs) => void;
  activeProvider: 'azure' | 'aws';
  onProviderChange: (provider: 'azure' | 'aws') => void;
}

type AzureTier = 'hot' | 'cold' | 'archive';
type AWSTier = 'hot' | 'cold' | 'archive';

const AZURE_TIER_LABELS: Record<AzureTier, string> = {
  hot: 'Hot',
  cold: 'Cold',
  archive: 'Archive',
};

const AWS_TIER_LABELS: Record<AWSTier, string> = {
  hot: 'S3 Standard',
  cold: 'S3 Standard-IA',
  archive: 'S3 Glacier Flexible Retrieval',
};

export default function AdditionalCostParameters({
  transactions,
  awsTransactions,
  onTransactionsChange,
  onAWSTransactionsChange,
  activeProvider,
  onProviderChange,
}: AdditionalCostParametersProps) {
  const [activeAzureTier, setActiveAzureTier] = useState<AzureTier>('hot');
  const [activeAWSTier, setActiveAWSTier] = useState<AWSTier>('hot');

  const updateAzureTierField = <K extends keyof TierTransactionInputs>(
    tier: AzureTier,
    field: K,
    value: TierTransactionInputs[K]
  ) => {
    onTransactionsChange({
      ...transactions,
      [tier]: {
        ...transactions[tier],
        [field]: value,
      },
    });
  };

  const updateAWSTierField = <K extends keyof AWSTierTransactionInputs>(
    tier: AWSTier,
    field: K,
    value: AWSTierTransactionInputs[K]
  ) => {
    onAWSTransactionsChange({
      ...awsTransactions,
      [tier]: {
        ...awsTransactions[tier],
        [field]: value,
      },
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-5 h-full backdrop-blur-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-5 tracking-tight">Additional Cost Parameters</h2>

      {/* Provider Tabs */}
      <div className="flex border-b-2 border-slate-200 mb-5 -mx-5 px-5">
        <button
          onClick={() => onProviderChange('azure')}
          className={`px-4 py-2 font-bold text-xs transition-all relative ${
            activeProvider === 'azure'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Azure Costs
          {activeProvider === 'azure' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>
          )}
        </button>
        <button
          onClick={() => onProviderChange('aws')}
          className={`px-4 py-2 font-bold text-xs transition-all relative ${
            activeProvider === 'aws'
              ? 'text-indigo-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          AWS S3 Costs
          {activeProvider === 'aws' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>
          )}
        </button>
      </div>

      {activeProvider === 'azure' && (
        <div>
          <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">
            Enter transaction and usage data to calculate incremental costs (transactions, retrieval, query acceleration).
            These costs will be added to the storage costs shown in the comparison cards.
          </p>

          {/* Azure Tier Tabs */}
          <div className="flex border-b border-slate-200 mb-4 -mx-5 px-5">
            {(['hot', 'cold', 'archive'] as AzureTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setActiveAzureTier(tier)}
                className={`px-3 py-2 font-semibold text-xs transition-all relative mr-2 ${
                  activeAzureTier === tier
                    ? 'text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {AZURE_TIER_LABELS[tier]}
                {activeAzureTier === tier && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>
                )}
              </button>
            ))}
          </div>

          {/* Azure Tier-specific inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                Read Operations (per 10,000)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={transactions[activeAzureTier].readOperations || ''}
                onChange={(e) => updateAzureTierField(activeAzureTier, 'readOperations', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                Write Operations (per 10,000)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={transactions[activeAzureTier].writeOperations || ''}
                onChange={(e) => updateAzureTierField(activeAzureTier, 'writeOperations', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
              />
            </div>

            {activeAzureTier !== 'archive' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Query Acceleration - Data Scanned (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions[activeAzureTier].queryAccelerationScannedGB || ''}
                    onChange={(e) => updateAzureTierField(activeAzureTier, 'queryAccelerationScannedGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Query Acceleration - Data Returned (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions[activeAzureTier].queryAccelerationReturnedGB || ''}
                    onChange={(e) => updateAzureTierField(activeAzureTier, 'queryAccelerationReturnedGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>
              </>
            )}

            {activeAzureTier === 'archive' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Archive High Priority Read (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions[activeAzureTier].archiveHighPriorityRead || ''}
                    onChange={(e) => updateAzureTierField(activeAzureTier, 'archiveHighPriorityRead', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Archive High Priority Retrieval (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions[activeAzureTier].archiveHighPriorityRetrievalGB || ''}
                    onChange={(e) => updateAzureTierField(activeAzureTier, 'archiveHighPriorityRetrievalGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>
              </>
            )}

            {(activeAzureTier === 'cold' || activeAzureTier === 'archive') && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Data Retrieval (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions[activeAzureTier].dataRetrievalGB || ''}
                    onChange={(e) => updateAzureTierField(activeAzureTier, 'dataRetrievalGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    {activeAzureTier === 'cold' ? 'Standard retrieval for cold tier' : 'Standard retrieval for archive (if not using high priority)'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Storage Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions[activeAzureTier].storageDurationDays || ''}
                    onChange={(e) => updateAzureTierField(activeAzureTier, 'storageDurationDays', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    {activeAzureTier === 'cold' 
                      ? 'For early deletion penalty (minimum 90 days)' 
                      : 'For early deletion penalty (minimum 180 days)'}
                  </p>
                </div>
              </>
            )}

            {activeAzureTier === 'hot' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Iterative Read Operations (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions[activeAzureTier].iterativeReadOperations || ''}
                    onChange={(e) => updateAzureTierField(activeAzureTier, 'iterativeReadOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Iterative Write Operations (per 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions[activeAzureTier].iterativeWriteOperations || ''}
                    onChange={(e) => updateAzureTierField(activeAzureTier, 'iterativeWriteOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Other Operations (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions[activeAzureTier].otherOperations || ''}
                    onChange={(e) => updateAzureTierField(activeAzureTier, 'otherOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>
              </>
            )}

            {(activeAzureTier === 'cold' || activeAzureTier === 'archive') && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                  Iterative Write Operations (per 100)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={transactions[activeAzureTier].iterativeWriteOperations || ''}
                  onChange={(e) => updateAzureTierField(activeAzureTier, 'iterativeWriteOperations', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {activeProvider === 'aws' && (
        <div>
          <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">
            Enter AWS S3 request and retrieval data for each tier.
          </p>

          {/* AWS Tier Tabs */}
          <div className="flex border-b border-slate-200 mb-4 -mx-5 px-5">
            {(['hot', 'cold', 'archive'] as AWSTier[]).map((tier) => (
              <button
                key={tier}
                onClick={() => setActiveAWSTier(tier)}
                className={`px-3 py-2 font-semibold text-xs transition-all relative mr-2 ${
                  activeAWSTier === tier
                    ? 'text-indigo-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {AWS_TIER_LABELS[tier]}
                {activeAWSTier === tier && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full"></span>
                )}
              </button>
            ))}
          </div>

          {/* AWS Tier-specific inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                PUT/COPY/POST/LIST Requests (per 1,000)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={awsTransactions[activeAWSTier].putCopyPostListRequests || ''}
                onChange={(e) => updateAWSTierField(activeAWSTier, 'putCopyPostListRequests', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                GET/SELECT Requests (per 1,000)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={awsTransactions[activeAWSTier].getSelectRequests || ''}
                onChange={(e) => updateAWSTierField(activeAWSTier, 'getSelectRequests', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
              />
            </div>

            {(activeAWSTier === 'cold' || activeAWSTier === 'archive') && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Data Retrieval (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={awsTransactions[activeAWSTier].dataRetrievalGB || ''}
                    onChange={(e) => updateAWSTierField(activeAWSTier, 'dataRetrievalGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Applies to Standard-IA and Glacier</p>
                </div>

                {activeAWSTier === 'archive' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                        Data Retrieval Requests (per 1,000)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={awsTransactions[activeAWSTier].dataRetrievalRequests || ''}
                        onChange={(e) => updateAWSTierField(activeAWSTier, 'dataRetrievalRequests', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                      />
                      <p className="text-[10px] text-slate-500 mt-1 font-medium">For Glacier only</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                        Retrieval Type (Glacier)
                      </label>
                      <select
                        value={awsTransactions[activeAWSTier].retrievalType || 'standard'}
                        onChange={(e) => updateAWSTierField(activeAWSTier, 'retrievalType', e.target.value as 'standard' | 'expedited')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                      >
                        <option value="standard">Standard</option>
                        <option value="expedited">Expedited</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Storage Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={awsTransactions[activeAWSTier].storageDurationDays || ''}
                    onChange={(e) => updateAWSTierField(activeAWSTier, 'storageDurationDays', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">For early deletion penalty calculation</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
