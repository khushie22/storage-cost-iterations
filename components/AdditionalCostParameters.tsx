'use client';

import React, { useState } from 'react';
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
  const [isExpanded, setIsExpanded] = useState(false);

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

  const hasAnyAzureValue = Object.values(transactions).some(v => v && v > 0);
  const hasAnyAWSValue = Object.values(awsTransactions).some(v => v && v > 0);
  const hasAnyValue = hasAnyAzureValue || hasAnyAWSValue;

  return (
    <div className="bg-white rounded-lg shadow-md mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Additional Cost Parameters</h2>
          {hasAnyValue && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              Active
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4 mt-4">
            <button
              onClick={() => onProviderChange('azure')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeProvider === 'azure'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Azure Costs
            </button>
            <button
              onClick={() => onProviderChange('aws')}
              className={`px-4 py-2 font-medium text-sm transition-colors ${
                activeProvider === 'aws'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              AWS S3 Costs
            </button>
          </div>

          {activeProvider === 'azure' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Enter transaction and usage data to calculate incremental costs (transactions, retrieval, query acceleration).
                These costs will be added to the storage costs shown in the comparison cards.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Read Volume (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions.monthlyReadGB || ''}
                    onChange={(e) => updateAzureField('monthlyReadGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Write Volume (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions.monthlyWriteGB || ''}
                    onChange={(e) => updateAzureField('monthlyWriteGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Read Operations (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions.readOperations || ''}
                    onChange={(e) => updateAzureField('readOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Write Operations (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions.writeOperations || ''}
                    onChange={(e) => updateAzureField('writeOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Query Acceleration - Data Scanned (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions.queryAccelerationScannedGB || ''}
                    onChange={(e) => updateAzureField('queryAccelerationScannedGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Query Acceleration - Data Returned (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions.queryAccelerationReturnedGB || ''}
                    onChange={(e) => updateAzureField('queryAccelerationReturnedGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Archive High Priority Read (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions.archiveHighPriorityRead || ''}
                    onChange={(e) => updateAzureField('archiveHighPriorityRead', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Archive High Priority Retrieval (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={transactions.archiveHighPriorityRetrievalGB || ''}
                    onChange={(e) => updateAzureField('archiveHighPriorityRetrievalGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Iterative Read Operations (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions.iterativeReadOperations || ''}
                    onChange={(e) => updateAzureField('iterativeReadOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Iterative Write Operations (per 100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions.iterativeWriteOperations || ''}
                    onChange={(e) => updateAzureField('iterativeWriteOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Operations (per 10,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={transactions.otherOperations || ''}
                    onChange={(e) => updateAzureField('otherOperations', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeProvider === 'aws' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Enter AWS S3 request and retrieval data. Mapping: Hot → S3 Standard, Cold → S3 Standard-IA, Archive → S3 Glacier Flexible Retrieval.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PUT/COPY/POST/LIST Requests (per 1,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={awsTransactions.putCopyPostListRequests || ''}
                    onChange={(e) => updateAWSField('putCopyPostListRequests', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GET/SELECT Requests (per 1,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={awsTransactions.getSelectRequests || ''}
                    onChange={(e) => updateAWSField('getSelectRequests', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Retrieval (GB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={awsTransactions.dataRetrievalGB || ''}
                    onChange={(e) => updateAWSField('dataRetrievalGB', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Applies to Standard-IA and Glacier</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data Retrieval Requests (per 1,000)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={awsTransactions.dataRetrievalRequests || ''}
                    onChange={(e) => updateAWSField('dataRetrievalRequests', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">For Glacier only</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retrieval Type (Glacier)
                  </label>
                  <select
                    value={awsTransactions.retrievalType || 'standard'}
                    onChange={(e) => updateAWSField('retrievalType', e.target.value as 'standard' | 'expedited')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="standard">Standard</option>
                    <option value="expedited">Expedited</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Storage Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={awsTransactions.storageDurationDays || ''}
                    onChange={(e) => updateAWSField('storageDurationDays', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">For early deletion penalty calculation</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
