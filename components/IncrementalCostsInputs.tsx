'use client';

import React from 'react';
import { TransactionInputs } from '@/lib/costCalculator';

interface IncrementalCostsInputsProps {
  transactions: TransactionInputs;
  onTransactionsChange: (transactions: TransactionInputs) => void;
}

export default function IncrementalCostsInputs({
  transactions,
  onTransactionsChange,
}: IncrementalCostsInputsProps) {
  const updateField = <K extends keyof TransactionInputs>(
    field: K,
    value: TransactionInputs[K]
  ) => {
    onTransactionsChange({
      ...transactions,
      [field]: value,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Step 2: Incremental Costs</h2>
      <p className="text-sm text-gray-600 mb-6">
        Enter transaction and usage data to calculate incremental costs on top of the locked storage baseline.
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
            onChange={(e) => updateField('monthlyReadGB', parseFloat(e.target.value) || 0)}
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
            onChange={(e) => updateField('monthlyWriteGB', parseFloat(e.target.value) || 0)}
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
            onChange={(e) => updateField('readOperations', parseInt(e.target.value) || 0)}
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
            onChange={(e) => updateField('writeOperations', parseInt(e.target.value) || 0)}
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
            onChange={(e) => updateField('queryAccelerationScannedGB', parseFloat(e.target.value) || 0)}
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
            onChange={(e) => updateField('queryAccelerationReturnedGB', parseFloat(e.target.value) || 0)}
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
            onChange={(e) => updateField('archiveHighPriorityRead', parseInt(e.target.value) || 0)}
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
            onChange={(e) => updateField('archiveHighPriorityRetrievalGB', parseFloat(e.target.value) || 0)}
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
            onChange={(e) => updateField('iterativeReadOperations', parseInt(e.target.value) || 0)}
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
            onChange={(e) => updateField('iterativeWriteOperations', parseInt(e.target.value) || 0)}
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
            onChange={(e) => updateField('otherOperations', parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

