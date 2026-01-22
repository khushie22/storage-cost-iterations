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

// Tier-specific transaction inputs for Azure
export interface TierTransactionInputs {
  readOperations?: number; // per 10,000
  writeOperations?: number; // per 10,000
  queryAccelerationScannedGB?: number;
  queryAccelerationReturnedGB?: number;
  archiveHighPriorityRead?: number; // per 10,000 (archive only)
  archiveHighPriorityRetrievalGB?: number; // archive only
  dataRetrievalGB?: number; // cold tier only
  iterativeReadOperations?: number; // per 10,000
  iterativeWriteOperations?: number; // per 100
  otherOperations?: number; // per 10,000
  storageDurationDays?: number; // for early deletion calculation (cold and archive tiers)
}

export interface TransactionInputs {
  hot: TierTransactionInputs;
  cold: TierTransactionInputs;
  archive: TierTransactionInputs;
}

// Tier-specific transaction inputs for AWS
export interface AWSTierTransactionInputs {
  putCopyPostListRequests?: number; // per 1,000
  getSelectRequests?: number; // per 1,000
  dataRetrievalGB?: number; // per GB (cold and archive only)
  dataRetrievalRequests?: number; // per 1,000 (Glacier only)
  retrievalType?: 'standard' | 'expedited'; // for Glacier
  storageDurationDays?: number; // for early deletion calculation
}

export interface AWSTransactionInputs {
  hot: AWSTierTransactionInputs;
  cold: AWSTierTransactionInputs;
  archive: AWSTierTransactionInputs;
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
  tierTransactions: TierTransactionInputs,
  pricing: any
): number {
  let cost = 0;

  // Write operations (per 10,000)
  if (tierTransactions.writeOperations && tierTransactions.writeOperations > 0 && pricing.writeOperations) {
    cost += (tierTransactions.writeOperations / 10000) * pricing.writeOperations;
  }

  // Read operations (per 10,000)
  if (tierTransactions.readOperations && tierTransactions.readOperations > 0 && pricing.readOperations) {
    cost += (tierTransactions.readOperations / 10000) * pricing.readOperations;
  }

  // Iterative read operations
  if (tierTransactions.iterativeReadOperations && tierTransactions.iterativeReadOperations > 0 && pricing.iterativeReadOperations) {
    cost += (tierTransactions.iterativeReadOperations / 10000) * pricing.iterativeReadOperations;
  }

  // Iterative write operations (per 100)
  if (tierTransactions.iterativeWriteOperations && tierTransactions.iterativeWriteOperations > 0 && pricing.iterativeWriteOperations) {
    cost += (tierTransactions.iterativeWriteOperations / 100) * pricing.iterativeWriteOperations;
  }

  // Other operations
  if (tierTransactions.otherOperations && tierTransactions.otherOperations > 0 && pricing.otherOperations) {
    cost += (tierTransactions.otherOperations / 10000) * pricing.otherOperations;
  }

  // Archive high priority read
  if (tier === 'archive' && tierTransactions.archiveHighPriorityRead && tierTransactions.archiveHighPriorityRead > 0 && pricing.archiveHighPriorityRead) {
    cost += (tierTransactions.archiveHighPriorityRead / 10000) * pricing.archiveHighPriorityRead;
  }

  return cost;
}

/**
 * Calculate retrieval costs for a tier
 */
function calculateRetrievalCosts(
  tier: StorageTier,
  tierTransactions: TierTransactionInputs,
  pricing: any
): number {
  let cost = 0;

  // Data retrieval (per GB)
  if (tier === 'cold' || tier === 'archive') {
    const retrievalGB = tier === 'archive' 
      ? (tierTransactions.archiveHighPriorityRetrievalGB || tierTransactions.dataRetrievalGB || 0)
      : (tierTransactions.dataRetrievalGB || 0);

    if (retrievalGB > 0) {
      if (tier === 'archive' && tierTransactions.archiveHighPriorityRetrievalGB && pricing.archiveHighPriorityRetrieval) {
        // High priority retrieval
        cost += tierTransactions.archiveHighPriorityRetrievalGB * pricing.archiveHighPriorityRetrieval;
      } else if (tier === 'archive' && tierTransactions.dataRetrievalGB && pricing.dataRetrieval) {
        // Standard archive retrieval
        cost += tierTransactions.dataRetrievalGB * pricing.dataRetrieval;
      } else if (tier === 'cold' && tierTransactions.dataRetrievalGB && pricing.dataRetrieval) {
        // Cold tier retrieval
        cost += tierTransactions.dataRetrievalGB * pricing.dataRetrieval;
      }
    }
  }

  return cost;
}

/**
 * Calculate query acceleration costs
 */
function calculateQueryAccelerationCosts(
  tierTransactions: TierTransactionInputs,
  pricing: any
): number {
  let cost = 0;

  if (tierTransactions.queryAccelerationScannedGB && tierTransactions.queryAccelerationScannedGB > 0 && pricing.queryAccelerationScanned) {
    cost += tierTransactions.queryAccelerationScannedGB * pricing.queryAccelerationScanned;
  }

  if (tierTransactions.queryAccelerationReturnedGB && tierTransactions.queryAccelerationReturnedGB > 0 && pricing.queryAccelerationReturned) {
    cost += tierTransactions.queryAccelerationReturnedGB * pricing.queryAccelerationReturned;
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
    const tierTransactions = database.transactions[tier];

    // Storage cost
    const storageCost = calculateStorageCost(sizeGB, tierPricing.storage);
    breakdown[tier].storage = storageCost;

    // Transaction costs
    const transactionCost = calculateTransactionCosts(tier, tierTransactions, tierPricing);
    breakdown[tier].transactions = transactionCost;

    // Retrieval costs
    const retrievalCost = calculateRetrievalCosts(tier, tierTransactions, tierPricing);
    breakdown[tier].retrieval = retrievalCost;

    // Query acceleration (only for hot/cold)
    if (tier !== 'archive') {
      const queryCost = calculateQueryAccelerationCosts(tierTransactions, tierPricing);
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
  earlyDeletion?: number; // For AWS and Azure
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
  let totalEarlyDeletion = 0;

  for (const tier of tiers) {
    const tierPricing = config.tiers[tier];
    const tierTransactions = transactions[tier];

    // Transaction costs
    const transactionCost = calculateTransactionCosts(tier, tierTransactions, tierPricing);
    totalTransactions += transactionCost;

    // Retrieval costs
    const retrievalCost = calculateRetrievalCosts(tier, tierTransactions, tierPricing);
    totalRetrieval += retrievalCost;

    // Query acceleration (only for hot/cold)
    if (tier !== 'archive') {
      const queryCost = calculateQueryAccelerationCosts(tierTransactions, tierPricing);
      totalQueryAcceleration += queryCost;
    }

    // Early deletion penalty (for cold and archive tiers)
    if ((tier === 'cold' || tier === 'archive') && tierPricing.minimumStorageDurationDays && tierTransactions.storageDurationDays) {
      const sizeGB = tierAllocation[tier];
      const remainingDays = tierPricing.minimumStorageDurationDays - tierTransactions.storageDurationDays;
      if (remainingDays > 0 && tierPricing.earlyDeletionPenalty) {
        // Prorated early deletion fee: sizeGB × earlyDeletionPenalty × (remainingDays / minimumStorageDurationDays)
        totalEarlyDeletion += sizeGB * tierPricing.earlyDeletionPenalty * (remainingDays / tierPricing.minimumStorageDurationDays);
      }
    }
  }

  // Multiply by number of databases
  const total = (totalTransactions + totalRetrieval + totalQueryAcceleration + totalEarlyDeletion) * numberOfDatabases;

  return {
    transactions: totalTransactions * numberOfDatabases,
    retrieval: totalRetrieval * numberOfDatabases,
    queryAcceleration: totalQueryAcceleration * numberOfDatabases,
    earlyDeletion: totalEarlyDeletion * numberOfDatabases,
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
    const tierTransactions = awsTransactions[tier];

    // Request costs (PUT/COPY/POST/LIST + GET/SELECT)
    if (tierTransactions.putCopyPostListRequests && tierTransactions.putCopyPostListRequests > 0) {
      totalRequests += (tierTransactions.putCopyPostListRequests / 1000) * tierPricing.putCopyPostListRequests;
    }
    if (tierTransactions.getSelectRequests && tierTransactions.getSelectRequests > 0) {
      totalRequests += (tierTransactions.getSelectRequests / 1000) * tierPricing.getSelectRequests;
    }

    // Retrieval costs
    if (tierTransactions.dataRetrievalGB && tierTransactions.dataRetrievalGB > 0) {
      if (tier === 'cold' && tierPricing.dataRetrieval?.standard) {
        totalRetrieval += tierTransactions.dataRetrievalGB * tierPricing.dataRetrieval.standard;
      } else if (tier === 'archive' && tierPricing.dataRetrieval) {
        const retrievalType = tierTransactions.retrievalType || 'standard';
        const retrievalPrice = tierPricing.dataRetrieval[retrievalType];
        if (retrievalPrice) {
          totalRetrieval += tierTransactions.dataRetrievalGB * retrievalPrice;
        }
        // Add retrieval request cost for Glacier
        if (tierTransactions.dataRetrievalRequests && tierPricing.dataRetrievalRequests) {
          const requestPrice = tierPricing.dataRetrievalRequests[retrievalType];
          if (requestPrice) {
            totalRetrieval += (tierTransactions.dataRetrievalRequests / 1000) * requestPrice;
          }
        }
      }
    }

    // Early deletion penalty
    if (tierPricing.minimumStorageDurationDays && tierTransactions.storageDurationDays) {
      const remainingDays = tierPricing.minimumStorageDurationDays - tierTransactions.storageDurationDays;
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



