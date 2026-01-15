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
          { range: { min: 0, max: 51200 }, pricePerGB: 0.019 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.018 },
          { range: { min: 512000, max: null }, pricePerGB: 0.017 },
        ],
        writeOperations: 0.065,
        readOperations: 0.0052,
        iterativeReadOperations: 0.065,
        iterativeWriteOperations: 0.065,
        otherOperations: 0.0052,
        dataRetrieval: 0,
        dataWrite: 0,
        queryAccelerationScanned: 0.00226,
        queryAccelerationReturned: 0.00080,
        index: 0.0263,
      },
      cold: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.00443 },
        ],
        writeOperations: 0.288,
        readOperations: 0.16,
        iterativeWriteOperations: 0.065,
        dataRetrieval: 0.0369,
        dataWrite: 0,
        queryAccelerationScanned: 0.00246,
        queryAccelerationReturned: 0.0123,
        index: 0.0263,
      },
      archive: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.002 },
        ],
        writeOperations: 0.13,
        readOperations: 6.50,
        archiveHighPriorityRead: 79.95,
        iterativeWriteOperations: 0.065,
        dataRetrieval: 0.02,
        archiveHighPriorityRetrieval: 0.123,
        dataWrite: 0,
      },
    },
    reservedCapacity: {
      '100TB': 1545,
      '1PB': 15050,
    },
  },
  'data-lake-GRS': {
    type: 'data-lake',
    replication: 'GRS',
    tiers: {
      hot: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.037 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.036 },
          { range: { min: 512000, max: null }, pricePerGB: 0.034 },
        ],
        writeOperations: 0.13,
        readOperations: 0.0052,
        iterativeReadOperations: 0.13,
        iterativeWriteOperations: 0.13,
        otherOperations: 0.0052,
        dataRetrieval: 0,
        dataWrite: 0,
        queryAccelerationScanned: 0.00226,
        queryAccelerationReturned: 0.00080,
        index: 0.0526,
      },
      cold: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.00803 },
        ],
        writeOperations: 0.522,
        readOperations: 0.16,
        iterativeWriteOperations: 0.13,
        dataRetrieval: 0.0369,
        dataWrite: 0,
        queryAccelerationScanned: 0.00246,
        queryAccelerationReturned: 0.0123,
        index: 0.0526,
      },
      archive: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.004 },
        ],
        writeOperations: 0.26,
        readOperations: 6.50,
        archiveHighPriorityRead: 79.95,
        iterativeWriteOperations: 0.13,
        dataRetrieval: 0.02,
        archiveHighPriorityRetrieval: 0.123,
        dataWrite: 0,
      },
    },
    reservedCapacity: {
      '100TB': 3090,
      '1PB': 30099,
    },
  },
  'blob-LRS': {
    type: 'blob',
    replication: 'LRS',
    tiers: {
      hot: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.018 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.0173 },
          { range: { min: 512000, max: null }, pricePerGB: 0.0166 },
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
          { range: { min: 0, max: null }, pricePerGB: 0.00443 },
        ],
        writeOperations: 0.288,
        readOperations: 0.16,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.065,
        otherOperations: 0.005,
        dataRetrieval: 0.0369,
        dataWrite: 0,
      },
      archive: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.002 },
        ],
        writeOperations: 0.13,
        readOperations: 6.50,
        archiveHighPriorityRead: 79.95,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.065,
        otherOperations: 0.005,
        dataRetrieval: 0.02,
        archiveHighPriorityRetrieval: 0.123,
        dataWrite: 0,
      },
    },
    reservedCapacity: {
      '100TB': 1545,
      '1PB': 15050,
    },
  },
  'blob-GRS': {
    type: 'blob',
    replication: 'GRS',
    tiers: {
      hot: {
        storage: [
          { range: { min: 0, max: 51200 }, pricePerGB: 0.037 },
          { range: { min: 51200, max: 512000 }, pricePerGB: 0.0353 },
          { range: { min: 512000, max: null }, pricePerGB: 0.0339 },
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
          { range: { min: 0, max: null }, pricePerGB: 0.00803 },
        ],
        writeOperations: 0.522,
        readOperations: 0.16,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.13,
        otherOperations: 0.005,
        dataRetrieval: 0.0369,
        dataWrite: 0,
      },
      archive: {
        storage: [
          { range: { min: 0, max: null }, pricePerGB: 0.004 },
        ],
        writeOperations: 0.26,
        readOperations: 6.50,
        archiveHighPriorityRead: 79.95,
        iterativeReadOperations: 0.0052,
        iterativeWriteOperations: 0.13,
        otherOperations: 0.005,
        dataRetrieval: 0.02,
        archiveHighPriorityRetrieval: 0.123,
        dataWrite: 0,
      },
    },
    reservedCapacity: {
      '100TB': 3090,
      '1PB': 30099,
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



