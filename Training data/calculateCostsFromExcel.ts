/**
 * Calculate costs from Excel/CSV input file
 * Reads storage_cost_matrix_training_data.csv, calculates costs for each row, and outputs to storage_cost_matrix_training_data_costs_output.xlsx
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateStorageOnlyCosts,
  calculateIncrementalCosts,
  calculateAWSStorageOnlyCosts,
  calculateAWSIncrementalCosts,
  TierAllocation,
  TransactionInputs,
  AWSTransactionInputs,
  TierTransactionInputs,
} from '../lib/costCalculator';
import { StorageType, ReplicationType, Provider, getPricingConfig, getAWSPricingConfig, StorageTier } from '../lib/pricing';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readExcelFile(filePath: string): any[] {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data;
}

function writeExcelFile(data: any[], outputPath: string) {
  if (data.length === 0) {
    throw new Error('No data to write');
  }

  // Collect all unique keys from all rows (not just first row)
  const allUniqueKeys = new Set<string>();
  data.forEach(row => {
    Object.keys(row).forEach(key => allUniqueKeys.add(key));
  });
  
  // Separate input columns from cost columns
  const inputColumns = Array.from(allUniqueKeys).filter(key => 
    !key.startsWith('StorageCost_') && 
    !key.startsWith('TransactionCost_') && 
    key !== 'TransactionCost' &&
    key !== 'RequestCost' &&
    key !== 'RetrievalCost' &&
    key !== 'QueryAccelerationCost' &&
    key !== 'EarlyDeletionCost' &&
    key !== 'AdditionalCost_Total' &&
    key !== 'TotalCost'
  );
  
  // Define cost columns in the exact order we want
  const costColumns = [
    'StorageCost_Hot',
    'StorageCost_Cold',
    'StorageCost_Archive',
    'StorageCost_Index',
    'StorageCost_Total',
    'TransactionCost_Hot',
    'TransactionCost_Cold',
    'TransactionCost_Archive',
    'TransactionCost',
    'RetrievalCost',
    'QueryAccelerationCost',
    'RequestCost',
    'EarlyDeletionCost',
    'AdditionalCost_Total',
    'TotalCost',
  ];

  // Build the header array in the correct order
  const headers: string[] = [];
  
  // Add CombinationID first if it exists
  if (allUniqueKeys.has('CombinationID')) {
    headers.push('CombinationID');
  }
  
  // Add other input columns (excluding CombinationID)
  for (const key of inputColumns) {
    if (key !== 'CombinationID') {
      headers.push(key);
    }
  }
  
  // Add cost columns in order (only if they exist in any row)
  for (const key of costColumns) {
    if (allUniqueKeys.has(key)) {
      headers.push(key);
    }
  }

  // Reorder data to match header order
  const orderedData = data.map(row => {
    const orderedRow: any = {};
    for (const header of headers) {
      if (row[header] !== undefined) {
        orderedRow[header] = row[header];
      }
    }
    return orderedRow;
  });

  // Create worksheet with explicit header order
  const worksheet = XLSX.utils.json_to_sheet(orderedData, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
  XLSX.writeFile(workbook, outputPath);
}

/**
 * Map Excel row to cost calculator inputs
 * This function needs to be adapted based on the actual Excel column names
 */
function mapRowToInputs(row: any): {
  tierAllocation: TierAllocation;
  transactions: TransactionInputs;
  awsTransactions: AWSTransactionInputs;
  storageType: StorageType;
  replication: ReplicationType;
  provider: Provider;
  numberOfDatabases: number;
} {
  // Map based on common column name patterns
  // Adjust these based on actual Excel column names
  
  // Tier allocation (can be in GB or percentages)
  const hotGB = row['TierAllocation_Hot_GB'] ?? 
                (row['TierAllocation_Hot_Percent'] ? (row['DatabaseCapacityGB'] * row['TierAllocation_Hot_Percent'] / 100) : 0);
  const coldGB = row['TierAllocation_Cold_GB'] ?? 
                 (row['TierAllocation_Cold_Percent'] ? (row['DatabaseCapacityGB'] * row['TierAllocation_Cold_Percent'] / 100) : 0);
  const archiveGB = row['TierAllocation_Archive_GB'] ?? 
                    (row['TierAllocation_Archive_Percent'] ? (row['DatabaseCapacityGB'] * row['TierAllocation_Archive_Percent'] / 100) : 0);

  const tierAllocation: TierAllocation = {
    hot: Number(hotGB) || 0,
    cold: Number(coldGB) || 0,
    archive: Number(archiveGB) || 0,
  };

  // Azure transaction inputs
  const transactions: TransactionInputs = {
    hot: {
      readOperations: Number(row['Azure_Hot_ReadOperations']) || 0,
      writeOperations: Number(row['Azure_Hot_WriteOperations']) || 0,
      queryAccelerationScannedGB: Number(row['Azure_Hot_QueryAccelerationScannedGB']) || 0,
      queryAccelerationReturnedGB: Number(row['Azure_Hot_QueryAccelerationReturnedGB']) || 0,
      iterativeReadOperations: Number(row['Azure_Hot_IterativeReadOperations']) || 0,
      iterativeWriteOperations: Number(row['Azure_Hot_IterativeWriteOperations']) || 0,
      otherOperations: Number(row['Azure_Hot_OtherOperations']) || 0,
    },
    cold: {
      readOperations: Number(row['Azure_Cold_ReadOperations']) || 0,
      writeOperations: Number(row['Azure_Cold_WriteOperations']) || 0,
      queryAccelerationScannedGB: Number(row['Azure_Cold_QueryAccelerationScannedGB']) || 0,
      queryAccelerationReturnedGB: Number(row['Azure_Cold_QueryAccelerationReturnedGB']) || 0,
      iterativeWriteOperations: Number(row['Azure_Cold_IterativeWriteOperations']) || 0,
      dataRetrievalGB: Number(row['Azure_Cold_DataRetrievalGB']) || 0,
      storageDurationDays: Number(row['Azure_Cold_StorageDurationDays']) || undefined,
    },
    archive: {
      readOperations: Number(row['Azure_Archive_ReadOperations']) || 0,
      writeOperations: Number(row['Azure_Archive_WriteOperations']) || 0,
      archiveHighPriorityRead: Number(row['Azure_Archive_ArchiveHighPriorityRead']) || 0,
      archiveHighPriorityRetrievalGB: Number(row['Azure_Archive_ArchiveHighPriorityRetrievalGB']) || 0,
      dataRetrievalGB: Number(row['Azure_Archive_DataRetrievalGB']) || 0,
      iterativeWriteOperations: Number(row['Azure_Archive_IterativeWriteOperations']) || 0,
      storageDurationDays: Number(row['Azure_Archive_StorageDurationDays']) || undefined,
    },
  };

  // AWS transaction inputs
  const awsTransactions: AWSTransactionInputs = {
    hot: {
      putCopyPostListRequests: Number(row['AWS_Hot_PutCopyPostListRequests']) || 0,
      getSelectRequests: Number(row['AWS_Hot_GetSelectRequests']) || 0,
    },
    cold: {
      putCopyPostListRequests: Number(row['AWS_Cold_PutCopyPostListRequests']) || 0,
      getSelectRequests: Number(row['AWS_Cold_GetSelectRequests']) || 0,
      dataRetrievalGB: Number(row['AWS_Cold_DataRetrievalGB']) || 0,
      storageDurationDays: Number(row['AWS_Cold_StorageDurationDays']) || undefined,
    },
    archive: {
      putCopyPostListRequests: Number(row['AWS_Archive_PutCopyPostListRequests']) || 0,
      getSelectRequests: Number(row['AWS_Archive_GetSelectRequests']) || 0,
      dataRetrievalGB: Number(row['AWS_Archive_DataRetrievalGB']) || 0,
      dataRetrievalRequests: Number(row['AWS_Archive_DataRetrievalRequests']) || 0,
      retrievalType: (row['AWS_Archive_RetrievalType'] as 'standard' | 'expedited') || 'standard',
      storageDurationDays: Number(row['AWS_Archive_StorageDurationDays']) || undefined,
    },
  };

  // Storage configuration
  const storageType = (row['StorageType'] === 'data-lake' ? 'data-lake' : 'blob') as StorageType;
  const replication = (row['ReplicationType'] === 'GRS' ? 'GRS' : 'LRS') as ReplicationType;
  const provider = (row['CloudProvider'] === 'aws' ? 'aws' : 'azure') as Provider;
  const numberOfDatabases = Number(row['NumberOfDatabases']) || 1;

  return {
    tierAllocation,
    transactions,
    awsTransactions,
    storageType,
    replication,
    provider,
    numberOfDatabases,
  };
}

/**
 * Calculate transaction costs for a single tier (Azure)
 */
function calculateTierTransactionCosts(
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
 * Calculate request costs for a single tier (AWS)
 */
function calculateTierRequestCosts(
  tier: StorageTier,
  tierTransactions: any,
  pricing: any
): number {
  let cost = 0;

  // PUT/COPY/POST/LIST requests (per 1,000)
  if (tierTransactions.putCopyPostListRequests && tierTransactions.putCopyPostListRequests > 0 && pricing.putCopyPostListRequests) {
    cost += (tierTransactions.putCopyPostListRequests / 1000) * pricing.putCopyPostListRequests;
  }

  // GET/SELECT requests (per 1,000)
  if (tierTransactions.getSelectRequests && tierTransactions.getSelectRequests > 0 && pricing.getSelectRequests) {
    cost += (tierTransactions.getSelectRequests / 1000) * pricing.getSelectRequests;
  }

  return cost;
}

/**
 * Calculate cost for a single row
 */
function calculateCostForRow(row: any): any {
  try {
    const inputs = mapRowToInputs(row);
    const totalSizeGB = inputs.tierAllocation.hot + inputs.tierAllocation.cold + inputs.tierAllocation.archive;

    let storageCost = 0;
    let incrementalCost = 0;
    let totalCost = 0;
    let costBreakdown: any = {};

    if (inputs.provider === 'azure') {
      // Calculate Azure costs
      const storageBreakdown = calculateStorageOnlyCosts(
        totalSizeGB,
        inputs.tierAllocation,
        inputs.storageType,
        inputs.replication
      );

      const incrementalBreakdown = calculateIncrementalCosts(
        inputs.tierAllocation,
        inputs.transactions,
        inputs.storageType,
        inputs.replication,
        inputs.numberOfDatabases
      );

      // Calculate transaction costs per tier
      const config = getPricingConfig(inputs.storageType, inputs.replication);
      const tiers: StorageTier[] = ['hot', 'cold', 'archive'];
      const transactionCostsByTier: Record<string, number> = {};
      
      for (const tier of tiers) {
        const tierPricing = config.tiers[tier];
        const tierTransactions = inputs.transactions[tier];
        transactionCostsByTier[`TransactionCost_${tier.charAt(0).toUpperCase() + tier.slice(1)}`] = 
          calculateTierTransactionCosts(tier, tierTransactions, tierPricing) * inputs.numberOfDatabases;
      }

      storageCost = storageBreakdown.total * inputs.numberOfDatabases;
      incrementalCost = incrementalBreakdown.total;
      totalCost = storageCost + incrementalCost;

      costBreakdown = {
        StorageCost_Hot: storageBreakdown.hot * inputs.numberOfDatabases,
        StorageCost_Cold: storageBreakdown.cold * inputs.numberOfDatabases,
        StorageCost_Archive: storageBreakdown.archive * inputs.numberOfDatabases,
        StorageCost_Index: (storageBreakdown.index || 0) * inputs.numberOfDatabases,
        StorageCost_Total: storageCost,
        ...transactionCostsByTier,
        TransactionCost: incrementalBreakdown.transactions,
        RetrievalCost: incrementalBreakdown.retrieval,
        QueryAccelerationCost: incrementalBreakdown.queryAcceleration,
        EarlyDeletionCost: incrementalBreakdown.earlyDeletion || 0,
        AdditionalCost_Total: incrementalCost,
        TotalCost: totalCost,
      };
    } else {
      // Calculate AWS costs
      const storageBreakdown = calculateAWSStorageOnlyCosts(
        totalSizeGB,
        inputs.tierAllocation
      );

      const incrementalBreakdown = calculateAWSIncrementalCosts(
        inputs.tierAllocation,
        inputs.awsTransactions,
        inputs.numberOfDatabases
      );

      // Calculate request costs per tier (AWS)
      const awsConfig = getAWSPricingConfig();
      const tiers: StorageTier[] = ['hot', 'cold', 'archive'];
      const requestCostsByTier: Record<string, number> = {};
      
      for (const tier of tiers) {
        const tierPricing = awsConfig.tiers[tier];
        const tierTransactions = inputs.awsTransactions[tier];
        requestCostsByTier[`TransactionCost_${tier.charAt(0).toUpperCase() + tier.slice(1)}`] = 
          calculateTierRequestCosts(tier, tierTransactions, tierPricing) * inputs.numberOfDatabases;
      }

      storageCost = storageBreakdown.total * inputs.numberOfDatabases;
      incrementalCost = incrementalBreakdown.total;
      totalCost = storageCost + incrementalCost;

      costBreakdown = {
        StorageCost_Hot: storageBreakdown.hot * inputs.numberOfDatabases,
        StorageCost_Cold: storageBreakdown.cold * inputs.numberOfDatabases,
        StorageCost_Archive: storageBreakdown.archive * inputs.numberOfDatabases,
        StorageCost_Total: storageCost,
        TransactionCost_Hot: requestCostsByTier.TransactionCost_Hot || 0,
        TransactionCost_Cold: requestCostsByTier.TransactionCost_Cold || 0,
        TransactionCost_Archive: requestCostsByTier.TransactionCost_Archive || 0,
        TransactionCost: incrementalBreakdown.requests || 0, // For AWS, requests = transactions
        RequestCost: incrementalBreakdown.requests || 0,
        RetrievalCost: incrementalBreakdown.retrieval,
        EarlyDeletionCost: incrementalBreakdown.earlyDeletion || 0,
        AdditionalCost_Total: incrementalCost,
        TotalCost: totalCost,
      };
    }

    // Reorder to put CombinationID first
    const { CombinationID, ...restOfRow } = row;
    return {
      CombinationID: CombinationID ?? '',
      ...restOfRow,
      ...costBreakdown,
    };
  } catch (error) {
    console.error(`Error calculating cost for row:`, error);
    const { CombinationID, ...restOfRow } = row;
    return {
      CombinationID: CombinationID ?? '',
      ...restOfRow,
      TotalCost: 'ERROR',
      ErrorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const inputPath = path.resolve(__dirname, 'storage_cost_matrix_training_data.csv');
  const outputPath = path.resolve(__dirname, 'storage_cost_matrix_training_data_costs_output.xlsx');

  console.log('Reading CSV file...');
  const rows = readExcelFile(inputPath);

  // Filter out empty rows
  const filteredRows = rows.filter(row => {
    // Check if row has at least one non-empty value
    return Object.values(row).some(value => value !== null && value !== undefined && value !== '');
  });

  console.log(`Found ${rows.length} rows (${filteredRows.length} after filtering empty rows)`);
  if (filteredRows.length > 0) {
    console.log('\nColumn names:');
    console.log(Object.keys(filteredRows[0]).join(', '));
    console.log('\nFirst row sample (first 5 columns):');
    const firstRowKeys = Object.keys(filteredRows[0]).slice(0, 5);
    const firstRowSample: any = {};
    firstRowKeys.forEach(key => {
      firstRowSample[key] = filteredRows[0][key];
    });
    console.log(JSON.stringify(firstRowSample, null, 2));
  }

  console.log('\nProcessing rows and calculating costs...');
  const outputRows = filteredRows.map((row, index) => {
    if ((index + 1) % 10 === 0) {
      console.log(`Processed ${index + 1}/${filteredRows.length} rows...`);
    }
    return calculateCostForRow(row);
  });

  // Add empty rows after each class
  const outputRowsWithEmptyRows: any[] = [];
  let previousClass: number | null = null;
  
  for (let i = 0; i < outputRows.length; i++) {
    const row = outputRows[i];
    const currentClass = Number(row['Class']) || null;
    
    // If class changed and we have a previous class, add empty row
    if (previousClass !== null && currentClass !== null && currentClass !== previousClass) {
      // Create empty row with all keys from the previous row
      const emptyRow: any = {};
      Object.keys(outputRows[i - 1]).forEach(key => {
        emptyRow[key] = '';
      });
      outputRowsWithEmptyRows.push(emptyRow);
    }
    
    outputRowsWithEmptyRows.push(row);
    previousClass = currentClass;
  }

  console.log('\nWriting output Excel file...');
  writeExcelFile(outputRowsWithEmptyRows, outputPath);
  console.log(`\n✅ Output written to: ${outputPath}`);
  console.log(`📊 Processed ${filteredRows.length} rows`);
}

main().catch(console.error);
