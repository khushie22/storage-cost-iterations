/**
 * Azure Storage Pricing Configuration
 * Based on Azure's public pricing for Data Lake Storage and Blob Storage
 * All prices in USD
 */

export type StorageType = 'data-lake' | 'blob';
export type ReplicationType = 'LRS' | 'GRS';
export type StorageTier = 'hot' | 'cold' | 'archive';
export type Provider = 'azure' | 'aws';

export interface StoragePricingSlab {
  range: { min: number; max: number | null }; // in GB
  pricePerGB: number;
}

export interface TierPricing {
  storage: StoragePricingSlab[];
  writeOperations: number; // per 10,000 operations
  readOperations: number; // per 10,000 operations
  iterativeReadOperations?: number; // per 10,000 operations
  iterativeWriteOperations?: number; // per 100 operations
  otherOperations?: number; // per 10,000 operations
  archiveHighPriorityRead?: number; // per 10,000 operations
  dataRetrieval: number; // per GB (0 if free)
  archiveHighPriorityRetrieval?: number; // per GB
  dataWrite: number; // per GB (0 if free)
  queryAccelerationScanned?: number; // per GB
  queryAccelerationReturned?: number; // per GB
  index?: number; // per GB/month
  minimumStorageDurationDays?: number; // for early deletion penalty (Azure: Archive=180, Cold=90, Cool=30)
  earlyDeletionPenalty?: number; // per GB (calculated based on remaining days, typically same as storage price)
}

export interface StorageConfig {
  type: StorageType;
  replication: ReplicationType;
  tiers: {
    hot: TierPricing;
    cold: TierPricing;
    archive: TierPricing;
  };
  reservedCapacity?: {
    '100TB': number; // monthly
    '1PB': number; // monthly
  };
}

/**
 * Pricing configuration for all storage types
 */
export const PRICING_CONFIG: Record<`${StorageType}-${ReplicationType}`, StorageConfig> = {
  'data-lake-LRS': {
    type: 'data-lake',
    replication: 'LRS',
    tiers: {
      hot: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.021 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.020 },
          { range: { min: 512000, max: null }, pricePerGB: 0.020 },
        ],
        writeOperations: 0.065,
        readOperations: 0.0052,
        iterativeReadOperations: 0.065,
        iterativeWriteOperations: 0.065,
        otherOperations: 0.0052,
        dataRetrieval: 0,
        dataWrite: 0,
        queryAccelerationScanned: 0.002,
        queryAccelerationReturned: 0.0007,
        index: 0.0297,
      },
      cold: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.0036 },
        ],
        writeOperations: 0.234,
        readOperations: 0.13,
        iterativeWriteOperations: 0.065,
        dataRetrieval: 0.03,
        dataWrite: 0,
        queryAccelerationScanned: 0.002,
        queryAccelerationReturned: 0.01,
        index: 0.0297,
        minimumStorageDurationDays: 90,
        earlyDeletionPenalty: 0.0036, // Same as storage price per GB
      },
      archive: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.001 },
        ],
        writeOperations: 0.13,
        readOperations: 6.50,
        archiveHighPriorityRead: 65.00,
        iterativeWriteOperations: 0.065,
        dataRetrieval: 0.02,
        archiveHighPriorityRetrieval: 0.10,
        dataWrite: 0,
        minimumStorageDurationDays: 180,
        earlyDeletionPenalty: 0.001, // Same as storage price per GB
      },
    },
    reservedCapacity: {
      '100TB': 1747,
      '1PB': 17013,
    },
  },
  'data-lake-GRS': {
    type: 'data-lake',
    replication: 'GRS',
    tiers: {
      hot: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.046 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.044 },
          { range: { min: 512000, max: null }, pricePerGB: 0.043 },
        ],
        writeOperations: 0.13,
        readOperations: 0.0052,
        iterativeReadOperations: 0.13,
        iterativeWriteOperations: 0.13,
        otherOperations: 0.0052,
        dataRetrieval: 0,
        dataWrite: 0,
        queryAccelerationScanned: 0.002,
        queryAccelerationReturned: 0.0007,
        index: 0.0655,
      },
      cold: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.0081 },
        ],
        writeOperations: 0.468,
        readOperations: 0.13,
        iterativeWriteOperations: 0.13,
        dataRetrieval: 0.01,
        dataWrite: 0,
        queryAccelerationScanned: 0.002,
        queryAccelerationReturned: 0.01,
        index: 0.0655,
        minimumStorageDurationDays: 90,
        earlyDeletionPenalty: 0.0081, // Same as storage price per GB
      },
      archive: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.003 },
        ],
        writeOperations: 0.273,
        readOperations: 6.50,
        archiveHighPriorityRead: 65.00,
        iterativeWriteOperations: 0.13,
        dataRetrieval: 0.02,
        archiveHighPriorityRetrieval: 0.10,
        dataWrite: 0,
        minimumStorageDurationDays: 180,
        earlyDeletionPenalty: 0.003, // Same as storage price per GB
      },
    },
    reservedCapacity: {
      '100TB': 3846,
      '1PB': 37460,
    },
  },
  'blob-LRS': {
    type: 'blob',
    replication: 'LRS',
    tiers: {
      hot: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.021 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.02 },
          { range: { min: 512000, max: null }, pricePerGB: 0.0191 },
        ],
        writeOperations: 0.065,
        readOperations: 0.005,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.065,
        otherOperations: 0.005,
        dataRetrieval: 0,
        dataWrite: 0,
      },
      cold: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.0036 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.0036 },
          { range: { min: 512000, max: null }, pricePerGB: 0.0036 },
        ],
        writeOperations: 0.234,
        readOperations: 0.13,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.065,
        otherOperations: 0.005,
        dataRetrieval: 0.03,
        dataWrite: 0,
        minimumStorageDurationDays: 90,
        earlyDeletionPenalty: 0.0036, // Same as storage price per GB
      },
      archive: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.00099 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.00099 },
          { range: { min: 512000, max: null }, pricePerGB: 0.00099 },
        ],
        writeOperations: 0.13,
        readOperations: 6.50,
        archiveHighPriorityRead: 65.00,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.065,
        otherOperations: 0.005,
        dataRetrieval: 0.02,
        archiveHighPriorityRetrieval: 0.10,
        dataWrite: 0,
        minimumStorageDurationDays: 180,
        earlyDeletionPenalty: 0.00099, // Same as storage price per GB
      },
    },
    reservedCapacity: {
      '100TB': 1747,
      '1PB': 17013,
    },
  },
  'blob-GRS': {
    type: 'blob',
    replication: 'GRS',
    tiers: {
      hot: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.046 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.044 },
          { range: { min: 512000, max: null }, pricePerGB: 0.0421 },
        ],
        writeOperations: 0.13,
        readOperations: 0.005,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.13,
        otherOperations: 0.005,
        dataRetrieval: 0,
        dataWrite: 0,
      },
      cold: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.0081 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.0081 },
          { range: { min: 512000, max: null }, pricePerGB: 0.0081 },
        ],
        writeOperations: 0.468,
        readOperations: 0.13,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.13,
        otherOperations: 0.005,
        dataRetrieval: 0.03,
        dataWrite: 0,
        minimumStorageDurationDays: 90,
        earlyDeletionPenalty: 0.0081, // Same as storage price per GB
      },
      archive: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.00299 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.00299 },
          { range: { min: 512000, max: null }, pricePerGB: 0.00299 },
        ],
        writeOperations: 0.273,
        readOperations: 6.50,
        archiveHighPriorityRead: 65.00,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.065,
        otherOperations: 0.005,
        dataRetrieval: 0.02,
        archiveHighPriorityRetrieval: 0.10,
        dataWrite: 0,
        minimumStorageDurationDays: 180,
        earlyDeletionPenalty: 0.00299, // Same as storage price per GB
      },
    },
    reservedCapacity: {
      '100TB': 3846,
      '1PB': 37460,
    },
  },
};

/**
 * Get pricing config for a specific storage type and replication
 */
export function getPricingConfig(
  storageType: StorageType,
  replication: ReplicationType
): StorageConfig {
  return PRICING_CONFIG[`${storageType}-${replication}`];
}

/**
 * AWS S3 Pricing Configuration
 * Based on AWS S3 public pricing
 * All prices in USD
 */

export interface S3TierPricing {
  storage: StoragePricingSlab[];
  putCopyPostListRequests: number; // per 1,000 requests
  getSelectRequests: number; // per 1,000 requests
  dataRetrievalRequests?: {
    expedited?: number; // per 1,000 requests
    standard?: number; // per 1,000 requests
  };
  dataRetrieval?: {
    expedited?: number; // per GB
    standard?: number; // per GB
  };
  minimumStorageDurationDays?: number; // for early deletion penalty
  earlyDeletionPenalty?: number; // per GB (calculated based on remaining days)
}

export interface S3PricingConfig {
  provider: 'aws';
  tiers: {
    hot: S3TierPricing; // S3 Standard
    cold: S3TierPricing; // S3 Standard-IA
    archive: S3TierPricing; // S3 Glacier Flexible Retrieval
  };
}

export const AWS_S3_PRICING: S3PricingConfig = {
  provider: 'aws',
  tiers: {
    hot: {
      // S3 Standard
      storage: [
        { range: { min: 0, max: 51200 }, pricePerGB: 0.023 }, // First 50 TB
        { range: { min: 51200, max: 512000 }, pricePerGB: 0.022 }, // Next 450 TB
        { range: { min: 512000, max: null }, pricePerGB: 0.021 }, // Over 500 TB
      ],
      putCopyPostListRequests: 0.005, // per 1,000
      getSelectRequests: 0.0004, // per 1,000
      dataRetrieval: undefined, // No retrieval fees for Standard
    },
    cold: {
      // S3 Standard-IA
      storage: [
        { range: { min: 0, max: null }, pricePerGB: 0.0125 },
      ],
      putCopyPostListRequests: 0.01, // per 1,000
      getSelectRequests: 0.0001, // per 1,000
      dataRetrieval: {
        standard: 0.01, // per GB
      },
      minimumStorageDurationDays: 30,
      earlyDeletionPenalty: 0.0125, // per GB (same as storage price)
    },
    archive: {
      // S3 Glacier Flexible Retrieval
      storage: [
        { range: { min: 0, max: null }, pricePerGB: 0.0036 },
      ],
      putCopyPostListRequests: 0.03, // per 1,000
      getSelectRequests: 0.0004, // per 1,000
      dataRetrievalRequests: {
        expedited: 10.00, // per 1,000 requests
        standard: 0.05, // per 1,000 requests
      },
      dataRetrieval: {
        expedited: 0.03, // per GB
        standard: 0.01, // per GB
      },
      minimumStorageDurationDays: 90,
      earlyDeletionPenalty: 0.0036, // per GB (same as storage price)
    },
  },
};

/**
 * Get AWS S3 pricing config
 */
export function getAWSPricingConfig(): S3PricingConfig {
  return AWS_S3_PRICING;
}



