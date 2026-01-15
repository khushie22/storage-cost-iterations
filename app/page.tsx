'use client';

import React, { useState, useMemo } from 'react';
import StorageSidebar from '@/components/StorageSidebar';
import FilterSidebar from '@/components/FilterSidebar';
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
  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  // Storage Configuration (in GB)
  const [totalSizeGB, setTotalSizeGB] = useState(0);
  const [tierAllocation, setTierAllocation] = useState<TierAllocation>({ 
    hot: 0,
    cold: 0,
    archive: 0
  });
  const [numberOfDatabases, setNumberOfDatabases] = useState(0);
  
  // Evaluation state
  const [hasEvaluated, setHasEvaluated] = useState(false);
  
  // Filters for storage comparison view
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

  // Calculate storage costs for all options (only when evaluated)
  const allStorageOptions = useMemo(() => {
    if (!hasEvaluated || totalSizeGB === 0 || numberOfDatabases === 0) return [];
    return calculateAllStorageOptions(totalSizeGB, tierAllocation, numberOfDatabases);
  }, [totalSizeGB, tierAllocation, numberOfDatabases, hasEvaluated]);

  // Calculate incremental costs for all storage options when transaction inputs exist
  const incrementalCostsMap = useMemo(() => {
    if (!hasEvaluated) return new Map();
    
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
  }, [tierAllocation, transactions, awsTransactions, numberOfDatabases, hasEvaluated]);

  const handleEvaluate = () => {
    // Validate inputs
    if (totalSizeGB <= 0) {
      alert('Please enter a valid storage size (greater than 0 GB)');
      return;
    }
    if (numberOfDatabases <= 0) {
      alert('Please enter a valid number of databases (1-75)');
      return;
    }
    const totalAllocated = tierAllocation.hot + tierAllocation.cold + tierAllocation.archive;
    if (totalAllocated > totalSizeGB) {
      alert('Total tier allocation cannot exceed total storage size');
      return;
    }
    setHasEvaluated(true);
  };

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
    <div className="min-h-screen bg-gray-100">
      <StorageSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        totalSizeGB={totalSizeGB}
        tierAllocation={tierAllocation}
        numberOfDatabases={numberOfDatabases}
        onSizeChange={setTotalSizeGB}
        onAllocationChange={setTierAllocation}
        onNumberOfDatabasesChange={setNumberOfDatabases}
        onEvaluate={handleEvaluate}
      />

      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-80' : 'lg:ml-0'} ${filterSidebarOpen ? 'lg:mr-72' : 'lg:mr-0'}`}>
        <div className="p-6">
          <header className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Cloud Storage Cost Calculator
              </h1>
              <p className="text-gray-600">
                Compare storage costs across Azure and AWS S3 options
              </p>
            </div>
            <button
              onClick={() => setFilterSidebarOpen(!filterSidebarOpen)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
          </header>

          {!hasEvaluated ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="max-w-md mx-auto">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">Enter Storage Parameters</h2>
                <p className="text-gray-600 mb-6">
                  Use the left sidebar to configure your storage requirements, then click "Evaluate" to see cost comparisons.
                </p>
                <button
                  onClick={handleEvaluate}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Evaluate Costs
                </button>
              </div>
            </div>
          ) : (
            <>
              <AdditionalCostParameters
                transactions={transactions}
                awsTransactions={awsTransactions}
                onTransactionsChange={setTransactions}
                onAWSTransactionsChange={setAWSTransactions}
                activeProvider={activeProvider}
                onProviderChange={setActiveProvider}
              />

              <StorageComparisonCards
                results={allStorageOptions}
                numberOfDatabases={numberOfDatabases}
                showAnnual={showAnnual}
                onToggleAnnual={() => setShowAnnual(!showAnnual)}
                visibleTypes={visibleStorageTypes}
                incrementalCosts={incrementalCostsMap}
              />
            </>
          )}
        </div>
      </main>

      <FilterSidebar
        isOpen={filterSidebarOpen}
        onToggle={() => setFilterSidebarOpen(!filterSidebarOpen)}
        visibleTypes={visibleStorageTypes}
        onFilterChange={handleFilterChange}
        onClearAll={handleClearAllFilters}
        onSelectAll={handleSelectAllFilters}
      />
    </div>
  );
}
