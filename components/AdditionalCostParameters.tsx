'use client';

import React from 'react';
import { TransactionInputs, AWSTransactionInputs } from '@/lib/costCalculator';

interface AdditionalCostParametersProps {
  transactions: TransactionInputs;
  awsTransactions: AWSTransactionInputs;
  onTransactionsChange: (transactions: TransactionInputs) => void;
  onAWSTransactionsChange: (transactions: AWSTransactionInputs) => void;
  activeProvider: 'azure' | 'aws';
  onProviderChange: (provider: 'azure' | 'aws') => void;
}

export default function AdditionalCostParameters({
  transactions,
  awsTransactions,
  onTransactionsChange,
  onAWSTransactionsChange,
  activeProvider,
  onProviderChange,
}: AdditionalCostParametersProps) {
  const updateAzureField = <K extends keyof TransactionInputs>(
    field: K,
    value: TransactionInputs[K]
  ) => {
    onTransactionsChange({
      ...transactions,
      [field]: value,
    });
  };

  const updateAWSField = <K extends keyof AWSTransactionInputs>(
    field: K,
    value: AWSTransactionInputs[K]
  ) => {
    onAWSTransactionsChange({
      ...awsTransactions,
      [field]: value,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-5 h-full backdrop-blur-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-5 tracking-tight">Additional Cost Parameters</h2>

      {/* Tabs */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Monthly Read Volume (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions.monthlyReadGB || ''}
                    onChange={(e) => updateAzureField('monthlyReadGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Monthly Write Volume (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions.monthlyWriteGB || ''}
                    onChange={(e) => updateAzureField('monthlyWriteGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Read Operations (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions.readOperations || ''}
                    onChange={(e) => updateAzureField('readOperations', parseInt(e.target.value) || 0)}
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
                    value={transactions.writeOperations || ''}
                    onChange={(e) => updateAzureField('writeOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Query Acceleration - Data Scanned (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions.queryAccelerationScannedGB || ''}
                    onChange={(e) => updateAzureField('queryAccelerationScannedGB', parseFloat(e.target.value) || 0)}
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
                    value={transactions.queryAccelerationReturnedGB || ''}
                    onChange={(e) => updateAzureField('queryAccelerationReturnedGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Archive High Priority Read (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions.archiveHighPriorityRead || ''}
                    onChange={(e) => updateAzureField('archiveHighPriorityRead', parseInt(e.target.value) || 0)}
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
                    value={transactions.archiveHighPriorityRetrievalGB || ''}
                    onChange={(e) => updateAzureField('archiveHighPriorityRetrievalGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Iterative Read Operations (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions.iterativeReadOperations || ''}
                    onChange={(e) => updateAzureField('iterativeReadOperations', parseInt(e.target.value) || 0)}
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
                    value={transactions.iterativeWriteOperations || ''}
                    onChange={(e) => updateAzureField('iterativeWriteOperations', parseInt(e.target.value) || 0)}
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
                    value={transactions.otherOperations || ''}
                    onChange={(e) => updateAzureField('otherOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          )}

      {activeProvider === 'aws' && (
        <div>
          <p className="text-xs text-slate-600 mb-4 font-medium leading-relaxed">
            Enter AWS S3 request and retrieval data. Mapping: Hot → S3 Standard, Cold → S3 Standard-IA, Archive → S3 Glacier Flexible Retrieval.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    PUT/COPY/POST/LIST Requests (per 1,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={awsTransactions.putCopyPostListRequests || ''}
                    onChange={(e) => updateAWSField('putCopyPostListRequests', parseInt(e.target.value) || 0)}
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
                    value={awsTransactions.getSelectRequests || ''}
                    onChange={(e) => updateAWSField('getSelectRequests', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Data Retrieval (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={awsTransactions.dataRetrievalGB || ''}
                    onChange={(e) => updateAWSField('dataRetrievalGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">Applies to Standard-IA and Glacier</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Data Retrieval Requests (per 1,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={awsTransactions.dataRetrievalRequests || ''}
                    onChange={(e) => updateAWSField('dataRetrievalRequests', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">For Glacier only</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Retrieval Type (Glacier)
                  </label>
                  <select
                    value={awsTransactions.retrievalType || 'standard'}
                    onChange={(e) => updateAWSField('retrievalType', e.target.value as 'standard' | 'expedited')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  >
                    <option value="standard">Standard</option>
                    <option value="expedited">Expedited</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 tracking-wide">
                    Storage Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={awsTransactions.storageDurationDays || ''}
                    onChange={(e) => updateAWSField('storageDurationDays', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">For early deletion penalty calculation</p>
                </div>
          </div>
        </div>
      )}
    </div>
  );
}
