/**
 * Azure Storage Cost Calculator
 * Implements accurate cost calculation logic based on Azure pricing
 */

import { StorageType, ReplicationType, StorageTier, getPricingConfig, getAWSPricingConfig, Provider } from './pricing';

export interface TierAllocation {
  hot: number; // in GB
  cold: number; // in GB
  archive: number; // in GB
}

export interface TransactionInputs {
  monthlyReadGB: number;
  monthlyWriteGB: number;
  readOperations: number; // per 10,000
  writeOperations: number; // per 10,000
  queryAccelerationScannedGB?: number;
  queryAccelerationReturnedGB?: number;
  archiveHighPriorityRead?: number; // per 10,000
  archiveHighPriorityRetrievalGB?: number;
  iterativeReadOperations?: number; // per 10,000
  iterativeWriteOperations?: number; // per 100
  otherOperations?: number; // per 10,000
}

export interface AWSTransactionInputs {
  putCopyPostListRequests: number; // per 1,000
  getSelectRequests: number; // per 1,000
  dataRetrievalGB?: number; // per GB
  dataRetrievalRequests?: number; // per 1,000 (for Glacier)
  retrievalType?: 'standard' | 'expedited'; // for Glacier
  storageDurationDays?: number; // for early deletion calculation
}

export interface DatabaseConfig {
  id: string;
  totalSizeTB: number;
  tierAllocation: TierAllocation;
  transactions: TransactionInputs;
}

export interface TierCostBreakdown {
  storage: number;
  transactions: number;
  retrieval: number;
  queryAcceleration?: number;
  index?: number;
  total: number;
}

export interface DatabaseCostBreakdown {
  databaseId: string;
  hot: TierCostBreakdown;
  cold: TierCostBreakdown;
  archive: TierCostBreakdown;
  total: number;
}

export interface AggregateCosts {
  totalMonthly: number;
  byTier: {
    hot: number;
    cold: number;
    archive: number;
  };
  byDatabase: DatabaseCostBreakdown[];
}

/**
 * Calculate storage cost for a given tier and size
 * Applies volume pricing slabs correctly
 */
function calculateStorageCost(
  sizeGB: number,
  pricingSlabs: Array<{ range: { min: number; max: number | null }; pricePerGB: number }>
): number {
  if (sizeGB <= 0) return 0;

  let remainingGB = sizeGB;
  let totalCost = 0;

  for (const slab of pricingSlabs) {
    if (remainingGB <= 0) break;

    const slabMin = slab.range.min;
    const slabMax = slab.range.max;
    const slabSize = slabMax === null 
      ? remainingGB 
      : Math.min(remainingGB, slabMax - slabMin);

    if (slabSize > 0) {
      totalCost += slabSize * slab.pricePerGB;
      remainingGB -= slabSize;
    }
  }

  return totalCost;
}

/**
 * Calculate transaction costs for a tier
 */
function calculateTransactionCosts(
  tier: StorageTier,
  transactions: TransactionInputs,
  pricing: any
): number {
  let cost = 0;

  // Write operations (per 10,000)
  if (transactions.writeOperations > 0 && pricing.writeOperations) {
    cost += (transactions.writeOperations / 10000) * pricing.writeOperations;
  }

  // Read operations (per 10,000)
  if (transactions.readOperations > 0 && pricing.readOperations) {
    cost += (transactions.readOperations / 10000) * pricing.readOperations;
  }

  // Iterative read operations
  if (transactions.iterativeReadOperations && pricing.iterativeReadOperations) {
    cost += (transactions.iterativeReadOperations / 10000) * pricing.iterativeReadOperations;
  }

  // Iterative write operations (per 100)
  if (transactions.iterativeWriteOperations && pricing.iterativeWriteOperations) {
    cost += (transactions.iterativeWriteOperations / 100) * pricing.iterativeWriteOperations;
  }

  // Other operations
  if (transactions.otherOperations && pricing.otherOperations) {
    cost += (transactions.otherOperations / 10000) * pricing.otherOperations;
  }

  // Archive high priority read
  if (tier === 'archive' && transactions.archiveHighPriorityRead && pricing.archiveHighPriorityRead) {
    cost += (transactions.archiveHighPriorityRead / 10000) * pricing.archiveHighPriorityRead;
  }

  return cost;
}

/**
 * Calculate retrieval costs for a tier
 */
function calculateRetrievalCosts(
  tier: StorageTier,
  transactions: TransactionInputs,
  pricing: any
): number {
  let cost = 0;

  // Data retrieval (per GB)
  if (tier === 'cold' || tier === 'archive') {
    const retrievalGB = tier === 'archive' 
      ? (transactions.archiveHighPriorityRetrievalGB || 0)
      : transactions.monthlyReadGB;

    if (retrievalGB > 0) {
      if (tier === 'archive' && transactions.archiveHighPriorityRetrievalGB && pricing.archiveHighPriorityRetrieval) {
        // High priority retrieval
        cost += retrievalGB * pricing.archiveHighPriorityRetrieval;
      } else if (pricing.dataRetrieval) {
        // Standard retrieval
        cost += retrievalGB * pricing.dataRetrieval;
      }
    }
  }

  return cost;
}

/**
 * Calculate query acceleration costs
 */
function calculateQueryAccelerationCosts(
  transactions: TransactionInputs,
  pricing: any
): number {
  let cost = 0;

  if (transactions.queryAccelerationScannedGB && pricing.queryAccelerationScanned) {
    cost += transactions.queryAccelerationScannedGB * pricing.queryAccelerationScanned;
  }

  if (transactions.queryAccelerationReturnedGB && pricing.queryAccelerationReturned) {
    cost += transactions.queryAccelerationReturnedGB * pricing.queryAccelerationReturned;
  }

  return cost;
}

/**
 * Calculate index costs
 */
function calculateIndexCost(
  sizeGB: number,
  pricing: any
): number {
  if (!pricing.index || sizeGB <= 0) return 0;
  return sizeGB * pricing.index;
}

/**
 * Calculate cost breakdown for a single database
 */
export function calculateDatabaseCosts(
  database: DatabaseConfig,
  storageType: StorageType,
  replication: ReplicationType
): DatabaseCostBreakdown {
  const config = getPricingConfig(storageType, replication);
  const tiers: StorageTier[] = ['hot', 'cold', 'archive'];

  const breakdown: DatabaseCostBreakdown = {
    databaseId: database.id,
    hot: { storage: 0, transactions: 0, retrieval: 0, total: 0 },
    cold: { storage: 0, transactions: 0, retrieval: 0, total: 0 },
    archive: { storage: 0, transactions: 0, retrieval: 0, total: 0 },
    total: 0,
  };

  for (const tier of tiers) {
    const sizeTB = database.tierAllocation[tier];
    const sizeGB = sizeTB * 1024; // Convert TB to GB
    const tierPricing = config.tiers[tier];

    // Storage cost
    const storageCost = calculateStorageCost(sizeGB, tierPricing.storage);
    breakdown[tier].storage = storageCost;

    // Transaction costs
    const transactionCost = calculateTransactionCosts(tier, database.transactions, tierPricing);
    breakdown[tier].transactions = transactionCost;

    // Retrieval costs
    const retrievalCost = calculateRetrievalCosts(tier, database.transactions, tierPricing);
    breakdown[tier].retrieval = retrievalCost;

    // Query acceleration (only for hot/cold)
    if (tier !== 'archive') {
      const queryCost = calculateQueryAccelerationCosts(database.transactions, tierPricing);
      breakdown[tier].queryAcceleration = queryCost;
    }

    // Index cost (only for hot/cold in data lake)
    if (storageType === 'data-lake' && tier !== 'archive' && tierPricing.index) {
      const indexCost = calculateIndexCost(sizeGB, tierPricing);
      breakdown[tier].index = indexCost;
    }

    // Total for this tier
    breakdown[tier].total = 
      storageCost + 
      transactionCost + 
      retrievalCost + 
      (breakdown[tier].queryAcceleration || 0) + 
      (breakdown[tier].index || 0);
  }

  // Total for database
  breakdown.total = breakdown.hot.total + breakdown.cold.total + breakdown.archive.total;

  return breakdown;
}

/**
 * Calculate aggregate costs across all databases
 */
export function calculateAggregateCosts(
  databases: DatabaseConfig[],
  storageType: StorageType,
  replication: ReplicationType
): AggregateCosts {
  const byDatabase = databases.map(db => 
    calculateDatabaseCosts(db, storageType, replication)
  );

  const totalMonthly = byDatabase.reduce((sum, db) => sum + db.total, 0);

  const byTier = {
    hot: byDatabase.reduce((sum, db) => sum + db.hot.total, 0),
    cold: byDatabase.reduce((sum, db) => sum + db.cold.total, 0),
    archive: byDatabase.reduce((sum, db) => sum + db.archive.total, 0),
  };

  return {
    totalMonthly,
    byTier,
    byDatabase,
  };
}

/**
 * Storage-only cost breakdown (no transactions or retrieval)
 */
export interface StorageOnlyBreakdown {
  hot: number;
  cold: number;
  archive: number;
  total: number;
  index?: number; // Only for data lake hot/cold
}

/**
 * Calculate storage-only costs for a single database
 */
export function calculateStorageOnlyCosts(
  totalSizeGB: number,
  tierAllocation: TierAllocation,
  storageType: StorageType,
  replication: ReplicationType
): StorageOnlyBreakdown {
  const config = getPricingConfig(storageType, replication);
  const tiers: StorageTier[] = ['hot', 'cold', 'archive'];

  const breakdown: StorageOnlyBreakdown = {
    hot: 0,
    cold: 0,
    archive: 0,
    total: 0,
  };

  let totalIndexCost = 0;

  for (const tier of tiers) {
    const sizeGB = tierAllocation[tier]; // Already in GB
    const tierPricing = config.tiers[tier];

    // Storage cost only
    const storageCost = calculateStorageCost(sizeGB, tierPricing.storage);
    breakdown[tier] = storageCost;

    // Index cost (only for hot/cold in data lake)
    if (storageType === 'data-lake' && tier !== 'archive' && tierPricing.index) {
      const indexCost = calculateIndexCost(sizeGB, tierPricing);
      totalIndexCost += indexCost;
    }
  }

  breakdown.total = breakdown.hot + breakdown.cold + breakdown.archive;
  if (totalIndexCost > 0) {
    breakdown.index = totalIndexCost;
    breakdown.total += totalIndexCost;
  }

  return breakdown;
}

/**
 * Comparison result for a single storage option
 */
export interface StorageComparisonResult {
  provider: Provider;
  storageType?: StorageType;
  replication?: ReplicationType;
  breakdown: StorageOnlyBreakdown;
  totalForAllDatabases: number; // Multiplied by database count
  label: string; // Display label (e.g., "Azure Data Lake Storage (LRS)" or "AWS S3")
}

/**
 * Calculate AWS S3 storage-only costs
 */
export function calculateAWSStorageOnlyCosts(
  totalSizeGB: number,
  tierAllocation: TierAllocation
): StorageOnlyBreakdown {
  const config = getAWSPricingConfig();
  const tiers: StorageTier[] = ['hot', 'cold', 'archive'];

  const breakdown: StorageOnlyBreakdown = {
    hot: 0,
    cold: 0,
    archive: 0,
    total: 0,
  };

  for (const tier of tiers) {
    const sizeGB = tierAllocation[tier];
    const tierPricing = config.tiers[tier];

    // Storage cost only
    const storageCost = calculateStorageCost(sizeGB, tierPricing.storage);
    breakdown[tier] = storageCost;
  }

  breakdown.total = breakdown.hot + breakdown.cold + breakdown.archive;
  return breakdown;
}

/**
 * Calculate storage costs for all storage options (comparison view)
 */
export function calculateAllStorageOptions(
  totalSizeGB: number,
  tierAllocation: TierAllocation,
  numberOfDatabases: number,
  includeAWS: boolean = true
): StorageComparisonResult[] {
  const results: StorageComparisonResult[] = [];

  // Azure options
  const storageTypes: StorageType[] = ['data-lake', 'blob'];
  const replicationTypes: ReplicationType[] = ['LRS', 'GRS'];

  for (const storageType of storageTypes) {
    for (const replication of replicationTypes) {
      const breakdown = calculateStorageOnlyCosts(
        totalSizeGB,
        tierAllocation,
        storageType,
        replication
      );
      
      const storageTypeName = storageType === 'data-lake' ? 'Azure Data Lake Storage' : 'Azure Blob Storage';
      
      results.push({
        provider: 'azure',
        storageType,
        replication,
        breakdown,
        totalForAllDatabases: breakdown.total * numberOfDatabases,
        label: `${storageTypeName} (${replication})`,
      });
    }
  }

  // AWS S3 option
  if (includeAWS) {
    const awsBreakdown = calculateAWSStorageOnlyCosts(totalSizeGB, tierAllocation);
    results.push({
      provider: 'aws',
      breakdown: awsBreakdown,
      totalForAllDatabases: awsBreakdown.total * numberOfDatabases,
      label: 'AWS S3',
    });
  }

  return results;
}

/**
 * Incremental cost breakdown (transactions, retrieval, query acceleration)
 */
export interface IncrementalCostBreakdown {
  transactions: number;
  retrieval: number;
  queryAcceleration: number;
  total: number;
  requests?: number; // For AWS
  earlyDeletion?: number; // For AWS
}

/**
 * Calculate incremental costs (transactions, retrieval) on top of locked storage
 */
export function calculateIncrementalCosts(
  tierAllocation: TierAllocation,
  transactions: TransactionInputs,
  storageType: StorageType,
  replication: ReplicationType,
  numberOfDatabases: number
): IncrementalCostBreakdown {
  const config = getPricingConfig(storageType, replication);
  const tiers: StorageTier[] = ['hot', 'cold', 'archive'];

  let totalTransactions = 0;
  let totalRetrieval = 0;
  let totalQueryAcceleration = 0;

  for (const tier of tiers) {
    const tierPricing = config.tiers[tier];

    // Transaction costs
    const transactionCost = calculateTransactionCosts(tier, transactions, tierPricing);
    totalTransactions += transactionCost;

    // Retrieval costs
    const retrievalCost = calculateRetrievalCosts(tier, transactions, tierPricing);
    totalRetrieval += retrievalCost;

    // Query acceleration (only for hot/cold)
    if (tier !== 'archive') {
      const queryCost = calculateQueryAccelerationCosts(transactions, tierPricing);
      totalQueryAcceleration += queryCost;
    }
  }

  // Multiply by number of databases
  const total = (totalTransactions + totalRetrieval + totalQueryAcceleration) * numberOfDatabases;

  return {
    transactions: totalTransactions * numberOfDatabases,
    retrieval: totalRetrieval * numberOfDatabases,
    queryAcceleration: totalQueryAcceleration * numberOfDatabases,
    total,
  };
}

/**
 * Calculate AWS S3 incremental costs
 */
export function calculateAWSIncrementalCosts(
  tierAllocation: TierAllocation,
  awsTransactions: AWSTransactionInputs,
  numberOfDatabases: number
): IncrementalCostBreakdown & { earlyDeletion?: number; requests?: number } {
  const config = getAWSPricingConfig();
  const tiers: StorageTier[] = ['hot', 'cold', 'archive'];

  let totalRequests = 0;
  let totalRetrieval = 0;
  let totalEarlyDeletion = 0;

  for (const tier of tiers) {
    const tierPricing = config.tiers[tier];
    const sizeGB = tierAllocation[tier];

    // Request costs (PUT/COPY/POST/LIST + GET/SELECT)
    const putRequests = (awsTransactions.putCopyPostListRequests / 1000) * tierPricing.putCopyPostListRequests;
    const getRequests = (awsTransactions.getSelectRequests / 1000) * tierPricing.getSelectRequests;
    totalRequests += putRequests + getRequests;

    // Retrieval costs
    if (awsTransactions.dataRetrievalGB && awsTransactions.dataRetrievalGB > 0) {
      if (tier === 'cold' && tierPricing.dataRetrieval?.standard) {
        totalRetrieval += awsTransactions.dataRetrievalGB * tierPricing.dataRetrieval.standard;
      } else if (tier === 'archive' && tierPricing.dataRetrieval) {
        const retrievalType = awsTransactions.retrievalType || 'standard';
        const retrievalPrice = tierPricing.dataRetrieval[retrievalType];
        if (retrievalPrice) {
          totalRetrieval += awsTransactions.dataRetrievalGB * retrievalPrice;
        }
        // Add retrieval request cost for Glacier
        if (awsTransactions.dataRetrievalRequests && tierPricing.dataRetrievalRequests) {
          const requestPrice = tierPricing.dataRetrievalRequests[retrievalType];
          if (requestPrice) {
            totalRetrieval += (awsTransactions.dataRetrievalRequests / 1000) * requestPrice;
          }
        }
      }
    }

    // Early deletion penalty
    if (tierPricing.minimumStorageDurationDays && awsTransactions.storageDurationDays) {
      const remainingDays = tierPricing.minimumStorageDurationDays - awsTransactions.storageDurationDays;
      if (remainingDays > 0 && tierPricing.earlyDeletionPenalty) {
        totalEarlyDeletion += sizeGB * tierPricing.earlyDeletionPenalty * (remainingDays / tierPricing.minimumStorageDurationDays);
      }
    }
  }

  // Multiply by number of databases
  const total = (totalRequests + totalRetrieval + totalEarlyDeletion) * numberOfDatabases;

  return {
    transactions: totalRequests * numberOfDatabases,
    retrieval: totalRetrieval * numberOfDatabases,
    queryAcceleration: 0, // AWS doesn't have query acceleration
    requests: totalRequests * numberOfDatabases,
    earlyDeletion: totalEarlyDeletion * numberOfDatabases,
    total,
  };
}



