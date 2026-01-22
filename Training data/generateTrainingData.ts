/**
 * Generate synthetic training data CSV for Storage Cost Matrix
 * Based on the structure discussed:
 * - Classes: Logarithmic progression (1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75)
 * - Tier Allocations: Cumulative (3N combinations for Class N)
 * - Parameter Combinations: Cumulative, correlated with tier allocations (3N combinations for Class N)
 * - Outputs: 5 per combination (4 Azure: data-lake-LRS, data-lake-GRS, blob-LRS, blob-GRS + 1 AWS)
 */

import * as fs from 'fs';
import * as path from 'path';

// Classes: Logarithmic progression
const CLASSES = [1, 2, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75];
const CAPACITY_PER_DB_GB = 13.333333333; // 1TB / 75 = 13.33GB

// Tier Allocation Combinations (cumulative)
function generateTierAllocations(classNumber: number): Array<{ hot: number; cold: number; archive: number }> {
  const numCombinations = 3 * classNumber;
  const allocations: Array<{ hot: number; cold: number; archive: number }> = [];

  // Class 1: 3 basic combinations (include extreme cases but ensure they work with params)
  if (classNumber >= 1) {
    allocations.push({ hot: 100, cold: 0, archive: 0 }); // All hot (extreme case)
    allocations.push({ hot: 50, cold: 30, archive: 20 }); // Balanced
    allocations.push({ hot: 30, cold: 20, archive: 50 }); // Archive-heavy
  }

  // Class 2: Add 3 more (total 6) - include more extreme cases
  if (classNumber >= 2) {
    allocations.push({ hot: 0, cold: 100, archive: 0 }); // All cold (extreme case)
    allocations.push({ hot: 0, cold: 0, archive: 100 }); // All archive (extreme case)
    allocations.push({ hot: 85, cold: 10, archive: 5 }); // Hot-heavy
  }

  // Class 3+: Add more combinations progressively
  if (classNumber >= 3) {
    allocations.push({ hot: 33, cold: 33, archive: 34 }); // Even split
    allocations.push({ hot: 60, cold: 35, archive: 5 }); // Hot-cold
    allocations.push({ hot: 10, cold: 45, archive: 45 }); // Cold-archive
  }

  if (classNumber >= 4) {
    allocations.push({ hot: 80, cold: 15, archive: 5 });
    allocations.push({ hot: 50, cold: 30, archive: 20 });
    allocations.push({ hot: 15, cold: 15, archive: 70 });
  }

  if (classNumber >= 5) {
    allocations.push({ hot: 90, cold: 5, archive: 5 });
    allocations.push({ hot: 40, cold: 40, archive: 20 });
    allocations.push({ hot: 5, cold: 5, archive: 90 });
  }

  // For higher classes, add more granular variations
  if (classNumber >= 10) {
    // Add 5% increment variations
    for (let hot = 0; hot <= 100; hot += 5) {
      for (let cold = 0; cold <= 100 - hot; cold += 5) {
        const archive = 100 - hot - cold;
        if (allocations.length >= numCombinations) break;
        
        // Skip if already exists
        const exists = allocations.some(a => 
          Math.abs(a.hot - hot) < 1 && Math.abs(a.cold - cold) < 1 && Math.abs(a.archive - archive) < 1
        );
        if (!exists) {
          allocations.push({ hot, cold, archive });
        }
      }
      if (allocations.length >= numCombinations) break;
    }
  }

  // Ensure we have exactly numCombinations
  return allocations.slice(0, numCombinations);
}

// Parameter Combinations (cumulative, correlated with tier allocations)
function generateParameterCombinations(
  classNumber: number,
  tierAllocation: { hot: number; cold: number; archive: number }
): Array<{
  hot: any;
  cold: any;
  archive: any;
}> {
  const numCombinations = 3 * classNumber;
  const combinations: Array<{ hot: any; cold: any; archive: any }> = [];

  // Determine activity pattern based on tier allocation
  const isHotHeavy = tierAllocation.hot >= 70;
  const isColdHeavy = tierAllocation.cold >= 50;
  const isArchiveHeavy = tierAllocation.archive >= 50;
  const isBalanced = tierAllocation.hot >= 30 && tierAllocation.hot <= 60;

  // Economically realistic base activity levels
  // Hot tier: Reads dominate writes by 5-20x (realistic pattern)
  // Cold tier: Mostly inactive (zeros) with rare spikes
  // Archive tier: Write-once, read-almost-never
  const getActivityLevel = (tier: 'hot' | 'cold' | 'archive', multiplier: number = 1, pattern: 'normal' | 'read-heavy' | 'write-heavy' | 'inactive' | 'sparse' = 'normal') => {
    const base = {
      hot: {
        // Eco-realistic: Reads 10-15x writes (not 2:1)
        readOperations: pattern === 'read-heavy' ? 5000 : pattern === 'write-heavy' ? 500 : 2000,
        writeOperations: pattern === 'write-heavy' ? 1000 : pattern === 'read-heavy' ? 50 : 150,
        queryAccelerationScannedGB: pattern === 'inactive' ? 0 : 10,
        queryAccelerationReturnedGB: pattern === 'inactive' ? 0 : 1,
        iterativeReadOperations: pattern === 'inactive' ? 0 : 100,
        iterativeWriteOperations: pattern === 'inactive' ? 0 : 20, // Lower than reads
        otherOperations: pattern === 'inactive' ? 0 : 50,
      },
      cold: {
        // Eco-realistic: Mostly zeros, rare spikes (deterministic based on pattern)
        readOperations: pattern === 'sparse' ? (multiplier > 1.5 ? 50 : 0) : pattern === 'inactive' ? 0 : 20,
        writeOperations: pattern === 'sparse' ? (multiplier > 2 ? 10 : 0) : pattern === 'inactive' ? 0 : 5,
        queryAccelerationScannedGB: pattern === 'inactive' || pattern === 'sparse' ? 0 : 1,
        queryAccelerationReturnedGB: pattern === 'inactive' || pattern === 'sparse' ? 0 : 0.1,
        iterativeWriteOperations: pattern === 'inactive' || pattern === 'sparse' ? 0 : 2,
        dataRetrievalGB: pattern === 'sparse' ? (multiplier > 1.8 ? 2 : 0) : pattern === 'inactive' ? 0 : 1,
        storageDurationDays: 90, // Always set for early deletion calc
      },
      archive: {
        // Eco-realistic: Write-once, read-almost-never (deterministic)
        readOperations: pattern === 'sparse' ? (multiplier > 2.5 ? 1 : 0) : pattern === 'inactive' ? 0 : 0,
        writeOperations: pattern === 'sparse' ? (multiplier > 2 ? 1 : 0) : pattern === 'inactive' ? 0 : 1, // Write-once pattern
        archiveHighPriorityRead: pattern === 'sparse' ? (multiplier > 3 ? 1 : 0) : 0,
        archiveHighPriorityRetrievalGB: pattern === 'sparse' ? (multiplier > 2.8 ? 0.1 : 0) : 0,
        dataRetrievalGB: pattern === 'sparse' ? (multiplier > 2.7 ? 0.5 : 0) : 0,
        iterativeWriteOperations: 0, // Archive doesn't do iterative writes
        storageDurationDays: 180, // Always set for early deletion calc
      },
    };

    const tierBase = base[tier];
    const result: any = {};
    
    // Apply multiplier and round, but preserve zeros for sparse/inactive patterns
    for (const [key, value] of Object.entries(tierBase)) {
      if (typeof value === 'number') {
        result[key] = value === 0 ? 0 : Math.round(value * multiplier);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  };

  // Combination 1: Normal read-heavy pattern (eco-realistic)
  // Hot: Reads 10-15x writes, Cold: Mostly inactive, Archive: Write-once
  combinations.push({
    hot: getActivityLevel('hot', isHotHeavy ? 1.5 : 1, 'normal'),
    cold: getActivityLevel('cold', 1, 'sparse'), // Mostly zeros
    archive: getActivityLevel('archive', 1, 'sparse'), // Write-once, read-rarely
  });

  // Combination 2: High read activity (typical production pattern)
  // Hot: Very high reads, moderate writes, Cold: Rare spikes, Archive: Inactive
  combinations.push({
    hot: getActivityLevel('hot', isHotHeavy ? 2 : 1.5, 'read-heavy'),
    cold: getActivityLevel('cold', 1, 'inactive'), // Mostly zeros
    archive: getActivityLevel('archive', 1, 'inactive'), // Completely inactive
  });

  // Combination 3: Write-heavy (ingestion/ETL pattern - less common)
  // Hot: Higher writes, Cold: Some ingestion, Archive: Write-once spike
  combinations.push({
    hot: getActivityLevel('hot', isHotHeavy ? 1.2 : 1, 'write-heavy'),
    cold: getActivityLevel('cold', 1, 'normal'), // Some activity during ingestion
    archive: getActivityLevel('archive', 1, 'sparse'), // Occasional write
  });

  // Class 2+: Add eco-realistic variations
  if (classNumber >= 2) {
    // Very read-heavy (analytics workload)
    combinations.push({
      hot: getActivityLevel('hot', 2, 'read-heavy'),
      cold: getActivityLevel('cold', 1, 'inactive'),
      archive: getActivityLevel('archive', 1, 'inactive'),
    });

    // Query-intensive (data exploration)
    const queryHot = getActivityLevel('hot', 1.5, 'normal');
    queryHot.queryAccelerationScannedGB = 50;
    queryHot.queryAccelerationReturnedGB = 5;
    combinations.push({
      hot: queryHot,
      cold: getActivityLevel('cold', 1, 'inactive'),
      archive: getActivityLevel('archive', 1, 'inactive'),
    });

    // Cold tier retrieval spike (rare but realistic)
    combinations.push({
      hot: getActivityLevel('hot', 1, 'normal'),
      cold: getActivityLevel('cold', 1, 'sparse'), // Will have occasional retrieval
      archive: getActivityLevel('archive', 1, 'inactive'),
    });
  }

  // Class 3+: Add nuanced eco-realistic profiles
  if (classNumber >= 3) {
    // Iterative processing (batch jobs)
    const iterHot = getActivityLevel('hot', 1, 'normal');
    iterHot.iterativeReadOperations = 800;
    iterHot.iterativeWriteOperations = 100; // Still lower than reads
    combinations.push({
      hot: iterHot,
      cold: getActivityLevel('cold', 1, 'inactive'),
      archive: getActivityLevel('archive', 1, 'inactive'),
    });

    // Archive retrieval (compliance/audit - very rare)
    combinations.push({
      hot: getActivityLevel('hot', 0.5, 'normal'),
      cold: getActivityLevel('cold', 1, 'inactive'),
      archive: getActivityLevel('archive', 1, 'sparse'), // Rare retrieval
    });

    // Low activity overall (idle system)
    combinations.push({
      hot: getActivityLevel('hot', 0.3, 'normal'),
      cold: getActivityLevel('cold', 1, 'inactive'),
      archive: getActivityLevel('archive', 1, 'inactive'),
    });
  }

  // For higher classes, add more eco-realistic variations
  if (classNumber >= 5) {
    // Scale hot tier activity while keeping cold/archive sparse
    const hotMultipliers = [0.4, 0.6, 0.8, 1.2, 1.8, 2.5, 3.5];
    const coldPatterns: Array<'inactive' | 'sparse'> = ['inactive', 'sparse', 'inactive', 'sparse', 'inactive', 'sparse', 'inactive'];
    const archivePatterns: Array<'inactive' | 'sparse'> = ['inactive', 'inactive', 'sparse', 'inactive', 'inactive', 'sparse', 'inactive'];
    
    for (let i = 0; i < hotMultipliers.length; i++) {
      if (combinations.length >= numCombinations) break;
      combinations.push({
        hot: getActivityLevel('hot', hotMultipliers[i], 'normal'),
        cold: getActivityLevel('cold', 1, coldPatterns[i]),
        archive: getActivityLevel('archive', 1, archivePatterns[i]),
      });
    }
    
    // Add more read-heavy variations
    if (combinations.length < numCombinations) {
      combinations.push({
        hot: getActivityLevel('hot', 1.5, 'read-heavy'),
        cold: getActivityLevel('cold', 1, 'inactive'),
        archive: getActivityLevel('archive', 1, 'inactive'),
      });
    }
  }

  // Ensure we have exactly numCombinations
  return combinations.slice(0, numCombinations);
}

// Generate CSV rows
function generateCSVRows(): string[] {
  const rows: string[] = [];
  
  // CSV Header
  const headers = [
    'Class',
    'DatabaseCapacityGB',
    'TierAllocation_Hot_Percent',
    'TierAllocation_Cold_Percent',
    'TierAllocation_Archive_Percent',
    'TierAllocation_Hot_GB',
    'TierAllocation_Cold_GB',
    'TierAllocation_Archive_GB',
    // Azure Hot Tier Parameters
    'Azure_Hot_ReadOperations',
    'Azure_Hot_WriteOperations',
    'Azure_Hot_QueryAccelerationScannedGB',
    'Azure_Hot_QueryAccelerationReturnedGB',
    'Azure_Hot_IterativeReadOperations',
    'Azure_Hot_IterativeWriteOperations',
    'Azure_Hot_OtherOperations',
    // Azure Cold Tier Parameters
    'Azure_Cold_ReadOperations',
    'Azure_Cold_WriteOperations',
    'Azure_Cold_QueryAccelerationScannedGB',
    'Azure_Cold_QueryAccelerationReturnedGB',
    'Azure_Cold_IterativeWriteOperations',
    'Azure_Cold_DataRetrievalGB',
    'Azure_Cold_StorageDurationDays',
    // Azure Archive Tier Parameters
    'Azure_Archive_ReadOperations',
    'Azure_Archive_WriteOperations',
    'Azure_Archive_ArchiveHighPriorityRead',
    'Azure_Archive_ArchiveHighPriorityRetrievalGB',
    'Azure_Archive_DataRetrievalGB',
    'Azure_Archive_IterativeWriteOperations',
    'Azure_Archive_StorageDurationDays',
    // AWS Hot Tier Parameters
    'AWS_Hot_PutCopyPostListRequests',
    'AWS_Hot_GetSelectRequests',
    // AWS Cold Tier Parameters
    'AWS_Cold_PutCopyPostListRequests',
    'AWS_Cold_GetSelectRequests',
    'AWS_Cold_DataRetrievalGB',
    'AWS_Cold_StorageDurationDays',
    // AWS Archive Tier Parameters
    'AWS_Archive_PutCopyPostListRequests',
    'AWS_Archive_GetSelectRequests',
    'AWS_Archive_DataRetrievalGB',
    'AWS_Archive_DataRetrievalRequests',
    'AWS_Archive_RetrievalType',
    'AWS_Archive_StorageDurationDays',
    // Provider and Configuration
    'CloudProvider',
    'StorageType',
    'ReplicationType',
    'CombinationID',
  ];

  rows.push(headers.join(','));

  let combinationId = 1;

  for (const classNum of CLASSES) {
    const capacityGB = CAPACITY_PER_DB_GB * classNum;
    const tierAllocations = generateTierAllocations(classNum);

    for (const tierAlloc of tierAllocations) {
      const tierAllocGB = {
        hot: (tierAlloc.hot / 100) * capacityGB,
        cold: (tierAlloc.cold / 100) * capacityGB,
        archive: (tierAlloc.archive / 100) * capacityGB,
      };

      const paramCombinations = generateParameterCombinations(classNum, tierAlloc);

      for (const params of paramCombinations) {
        // Convert Azure params to AWS format (same values, different structure)
        const awsParams = {
          hot: {
            putCopyPostListRequests: Math.round((params.hot.writeOperations || 0) / 10),
            getSelectRequests: Math.round((params.hot.readOperations || 0) / 10),
          },
          cold: {
            putCopyPostListRequests: Math.round((params.cold.writeOperations || 0) / 10),
            getSelectRequests: Math.round((params.cold.readOperations || 0) / 10),
            dataRetrievalGB: params.cold.dataRetrievalGB || 0,
            storageDurationDays: params.cold.storageDurationDays || 0,
          },
          archive: {
            putCopyPostListRequests: Math.round((params.archive.writeOperations || 0) / 10),
            getSelectRequests: Math.round((params.archive.readOperations || 0) / 10),
            dataRetrievalGB: params.archive.dataRetrievalGB || 0,
            dataRetrievalRequests: Math.round((params.archive.archiveHighPriorityRead || 0) / 10),
            retrievalType: 'standard' as const,
            storageDurationDays: params.archive.storageDurationDays || 0,
          },
        };

        // Generate 4 Azure outputs + 1 AWS output
        const outputs = [
          { provider: 'azure', storageType: 'data-lake', replication: 'LRS' },
          { provider: 'azure', storageType: 'data-lake', replication: 'GRS' },
          { provider: 'azure', storageType: 'blob', replication: 'LRS' },
          { provider: 'azure', storageType: 'blob', replication: 'GRS' },
          { provider: 'aws', storageType: 's3', replication: 'standard' },
        ];

        for (const output of outputs) {
          const row = [
            classNum.toString(),
            capacityGB.toFixed(2),
            tierAlloc.hot.toFixed(2),
            tierAlloc.cold.toFixed(2),
            tierAlloc.archive.toFixed(2),
            tierAllocGB.hot.toFixed(2),
            tierAllocGB.cold.toFixed(2),
            tierAllocGB.archive.toFixed(2),
            // Azure Hot
            (params.hot.readOperations || 0).toString(),
            (params.hot.writeOperations || 0).toString(),
            (params.hot.queryAccelerationScannedGB || 0).toString(),
            (params.hot.queryAccelerationReturnedGB || 0).toString(),
            (params.hot.iterativeReadOperations || 0).toString(),
            (params.hot.iterativeWriteOperations || 0).toString(),
            (params.hot.otherOperations || 0).toString(),
            // Azure Cold
            (params.cold.readOperations || 0).toString(),
            (params.cold.writeOperations || 0).toString(),
            (params.cold.queryAccelerationScannedGB || 0).toString(),
            (params.cold.queryAccelerationReturnedGB || 0).toString(),
            (params.cold.iterativeWriteOperations || 0).toString(),
            (params.cold.dataRetrievalGB || 0).toString(),
            (params.cold.storageDurationDays || 0).toString(),
            // Azure Archive
            (params.archive.readOperations || 0).toString(),
            (params.archive.writeOperations || 0).toString(),
            (params.archive.archiveHighPriorityRead || 0).toString(),
            (params.archive.archiveHighPriorityRetrievalGB || 0).toString(),
            (params.archive.dataRetrievalGB || 0).toString(),
            (params.archive.iterativeWriteOperations || 0).toString(),
            (params.archive.storageDurationDays || 0).toString(),
            // AWS Hot
            awsParams.hot.putCopyPostListRequests.toString(),
            awsParams.hot.getSelectRequests.toString(),
            // AWS Cold
            awsParams.cold.putCopyPostListRequests.toString(),
            awsParams.cold.getSelectRequests.toString(),
            awsParams.cold.dataRetrievalGB.toString(),
            awsParams.cold.storageDurationDays.toString(),
            // AWS Archive
            awsParams.archive.putCopyPostListRequests.toString(),
            awsParams.archive.getSelectRequests.toString(),
            awsParams.archive.dataRetrievalGB.toString(),
            awsParams.archive.dataRetrievalRequests.toString(),
            awsParams.archive.retrievalType,
            awsParams.archive.storageDurationDays.toString(),
            // Provider info
            output.provider,
            output.storageType,
            output.replication,
            combinationId.toString(),
          ];

          rows.push(row.join(','));
        }

        combinationId++;
      }
    }
  }

  return rows;
}

// Main execution
function main() {
  console.log('Generating training data CSV...');
  const rows = generateCSVRows();
  const csvContent = rows.join('\n');
  
  const outputPath = path.join(__dirname, '..', 'Training data', 'storage_cost_matrix_training_data.csv');
  const outputDir = path.dirname(outputPath);
  const tempPath = path.join(__dirname, '..', 'Training data', 'storage_cost_matrix_training_data_temp.csv');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write to temp file first, then rename (to avoid file lock issues)
  fs.writeFileSync(tempPath, csvContent, 'utf-8');
  try {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    fs.renameSync(tempPath, outputPath);
  } catch (error) {
    // If rename fails, at least we have the temp file
    console.log(`⚠️  Could not replace existing file. Temp file saved at: ${tempPath}`);
  }
  console.log(`✅ Generated CSV with ${rows.length - 1} data rows (plus header)`);
  console.log(`📁 Saved to: ${outputPath}`);
}

main();
