'use client';

import React, { useState, useMemo } from 'react';
import StorageConfiguration from '@/components/StorageConfiguration';
import AddComponent from '@/components/AddComponent';
import AdditionalCostParameters from '@/components/AdditionalCostParameters';
import StorageComparisonCards from '@/components/StorageComparisonCards';
import { StorageType, ReplicationType } from '@/lib/pricing';
import { 
  calculateAllStorageOptions, 
  calculateIncrementalCosts,
  calculateAWSIncrementalCosts,
  TierAllocation,
  TransactionInputs,
  AWSTransactionInputs
} from '@/lib/costCalculator';

export default function Home() {
  // Storage Configuration (in GB)
  const [totalSizeGB, setTotalSizeGB] = useState(0);
  const [tierAllocation, setTierAllocation] = useState<TierAllocation>({ 
    hot: 0,
    cold: 0,
    archive: 0
  });
  const [numberOfDatabases, setNumberOfDatabases] = useState(0);
  
  // Filters for storage comparison view (default all visible)
  const [visibleStorageTypes, setVisibleStorageTypes] = useState<Set<string>>(
    new Set(['data-lake-LRS', 'data-lake-GRS', 'blob-LRS', 'blob-GRS', 'aws-s3'])
  );

  // Additional Cost Parameters
  const [activeProvider, setActiveProvider] = useState<'azure' | 'aws'>('azure');
  const [transactions, setTransactions] = useState<TransactionInputs>({
    monthlyReadGB: 0,
    monthlyWriteGB: 0,
    readOperations: 0,
    writeOperations: 0,
  });
  const [awsTransactions, setAWSTransactions] = useState<AWSTransactionInputs>({
    putCopyPostListRequests: 0,
    getSelectRequests: 0,
  });

  // Display options
  const [showAnnual, setShowAnnual] = useState(false);
  const [addComponentOpen, setAddComponentOpen] = useState(false);

  // Check if we have sufficient data to calculate costs
  const hasData = totalSizeGB > 0 && numberOfDatabases > 0;

  // Calculate storage costs for all options (automatically when data is available)
  const allStorageOptions = useMemo(() => {
    if (!hasData) return [];
    return calculateAllStorageOptions(totalSizeGB, tierAllocation, numberOfDatabases);
  }, [totalSizeGB, tierAllocation, numberOfDatabases, hasData]);

  // Calculate incremental costs for all storage options when transaction inputs exist
  const incrementalCostsMap = useMemo(() => {
    if (!hasData) return new Map();
    
    const costsMap = new Map<string, any>();

    // Azure incremental costs
    const hasAnyAzureTransactions = Object.values(transactions).some(v => v && v > 0);
    if (hasAnyAzureTransactions) {
      const storageTypes: StorageType[] = ['data-lake', 'blob'];
      const replicationTypes: ReplicationType[] = ['LRS', 'GRS'];

      for (const storageType of storageTypes) {
        for (const replication of replicationTypes) {
          const key = `azure-${storageType}-${replication}`;
          const costs = calculateIncrementalCosts(
            tierAllocation,
            transactions,
            storageType,
            replication,
            numberOfDatabases
          );
          costsMap.set(key, costs);
        }
      }
    }

    // AWS incremental costs
    const hasAnyAWSTransactions = Object.values(awsTransactions).some(v => v && v > 0);
    if (hasAnyAWSTransactions) {
      const key = 'aws-s3';
      const costs = calculateAWSIncrementalCosts(
        tierAllocation,
        awsTransactions,
        numberOfDatabases
      );
      costsMap.set(key, costs);
    }

    return costsMap;
  }, [tierAllocation, transactions, awsTransactions, numberOfDatabases, hasData]);

  const handleFilterChange = (key: string, visible: boolean) => {
    const newSet = new Set(visibleStorageTypes);
    if (visible) {
      newSet.add(key);
    } else {
      newSet.delete(key);
    }
    setVisibleStorageTypes(newSet);
  };

  const handleClearAllFilters = () => {
    setVisibleStorageTypes(new Set());
  };

  const handleSelectAllFilters = () => {
    setVisibleStorageTypes(new Set(['data-lake-LRS', 'data-lake-GRS', 'blob-LRS', 'blob-GRS', 'aws-s3']));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="p-8 max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
              Cloud Storage Cost Calculator
            </h1>
            <p className="text-slate-600 text-lg font-medium">
              Compare storage costs across Azure and AWS S3 options
            </p>
          </div>
          <AddComponent
            isOpen={addComponentOpen}
            onToggle={() => setAddComponentOpen(!addComponentOpen)}
            visibleTypes={visibleStorageTypes}
            onFilterChange={handleFilterChange}
            onClearAll={handleClearAllFilters}
            onSelectAll={handleSelectAllFilters}
          />
        </header>

        {/* Cards Row - Always visible at top */}
        <div className="mb-10">
          <StorageComparisonCards
            results={allStorageOptions}
            numberOfDatabases={numberOfDatabases}
            showAnnual={showAnnual}
            onToggleAnnual={() => setShowAnnual(!showAnnual)}
            visibleTypes={visibleStorageTypes}
            incrementalCosts={incrementalCostsMap}
            hasData={hasData}
            tierAllocation={tierAllocation}
            transactions={transactions}
            awsTransactions={awsTransactions}
          />
        </div>

        {/* Two Sections Below - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Section - Storage Configuration */}
          <StorageConfiguration
            totalSizeGB={totalSizeGB}
            tierAllocation={tierAllocation}
            numberOfDatabases={numberOfDatabases}
            onSizeChange={setTotalSizeGB}
            onAllocationChange={setTierAllocation}
            onNumberOfDatabasesChange={setNumberOfDatabases}
          />

          {/* Right Section - Additional Features */}
          <AdditionalCostParameters
            transactions={transactions}
            awsTransactions={awsTransactions}
            onTransactionsChange={setTransactions}
            onAWSTransactionsChange={setAWSTransactions}
            activeProvider={activeProvider}
            onProviderChange={setActiveProvider}
          />
        </div>
      </main>
    </div>
  );
}
