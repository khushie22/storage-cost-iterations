import { StorageComparisonResult, IncrementalCostBreakdown, TierAllocation, TransactionInputs, AWSTransactionInputs } from './costCalculator';
import { getPricingConfig, getAWSPricingConfig, StorageType, ReplicationType, StorageTier } from './pricing';

interface FlowchartData {
  storageResult: StorageComparisonResult;
  incrementalCosts?: IncrementalCostBreakdown;
  tierAllocation: TierAllocation;
  transactions?: TransactionInputs;
  awsTransactions?: AWSTransactionInputs;
  numberOfDatabases: number;
}

// Escape special characters for Mermaid
function escapeMermaidText(text: string): string {
  return text
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>')
    .replace(/\$/g, '&#36;')
    .replace(/\(/g, '&#40;')  // Escape opening parenthesis
    .replace(/\)/g, '&#41;'); // Escape closing parenthesis
}

export function generateFlowchartWithValues(data: FlowchartData): string {
  const { storageResult, incrementalCosts, tierAllocation, transactions, awsTransactions, numberOfDatabases } = data;
  const { provider, storageType, replication, breakdown } = storageResult;
  
  const hotGB = tierAllocation.hot;
  const coldGB = tierAllocation.cold;
  const archiveGB = tierAllocation.archive;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Remove parentheses from label to avoid Mermaid parsing issues
  const labelForDisplay = storageResult.label.replace(/[()]/g, '');
  
  // Build storage cost nodes only for tiers with size > 0
  const storageNodes: string[] = [];
  const storageConnections: string[] = [];
  let lastStorageNode = 'Inputs';
  
  if (hotGB > 0) {
    storageNodes.push(`    ${lastStorageNode} --> CalcHotStorage["Calculate Hot Storage Cost<br/>Size: ${formatNumber(hotGB)} GB<br/>Cost: ${formatCurrency(breakdown.hot)}<br/>Formula: slabSize × pricePerGB"]`);
    lastStorageNode = 'CalcHotStorage';
  }
  if (coldGB > 0) {
    storageNodes.push(`    ${lastStorageNode} --> CalcColdStorage["Calculate Cold Storage Cost<br/>Size: ${formatNumber(coldGB)} GB<br/>Cost: ${formatCurrency(breakdown.cold)}<br/>Formula: slabSize × pricePerGB"]`);
    lastStorageNode = 'CalcColdStorage';
  }
  if (archiveGB > 0) {
    storageNodes.push(`    ${lastStorageNode} --> CalcArchiveStorage["Calculate Archive Storage Cost<br/>Size: ${formatNumber(archiveGB)} GB<br/>Cost: ${formatCurrency(breakdown.archive)}<br/>Formula: slabSize × pricePerGB"]`);
    lastStorageNode = 'CalcArchiveStorage';
  }
  
  // If no storage nodes, connect Inputs directly to SumTier
  if (storageNodes.length === 0) {
    lastStorageNode = 'Inputs';
  }
  
  const indexNode = storageType === 'data-lake' && breakdown.index && (hotGB > 0 || coldGB > 0) ? `
    ${lastStorageNode} --> IndexCheck{Is Data Lake<br/>and Hot/Cold?}
    IndexCheck -->|Yes| CalcIndex["Calculate Index Cost<br/>Hot: ${formatNumber(hotGB)} GB × indexPrice = ${formatCurrency((breakdown.index || 0) * (hotGB + coldGB > 0 ? hotGB / (hotGB + coldGB) : 0))}<br/>Cold: ${formatNumber(coldGB)} GB × indexPrice = ${formatCurrency((breakdown.index || 0) * (hotGB + coldGB > 0 ? coldGB / (hotGB + coldGB) : 0))}<br/>Total Index: ${formatCurrency(breakdown.index || 0)}<br/>Formula: sizeGB × indexPrice"]
    CalcIndex --> SumTier
    IndexCheck -->|No| SumTier
  ` : `    ${lastStorageNode} --> SumTier`;
  
  // Build sum tier costs string - only include tiers with size > 0
  const tierCostsList: string[] = [];
  if (hotGB > 0) tierCostsList.push(`Hot: ${formatCurrency(breakdown.hot)}`);
  if (coldGB > 0) tierCostsList.push(`Cold: ${formatCurrency(breakdown.cold)}`);
  if (archiveGB > 0) tierCostsList.push(`Archive: ${formatCurrency(breakdown.archive)}`);
  if (storageType === 'data-lake' && breakdown.index && (hotGB > 0 || coldGB > 0)) {
    tierCostsList.push(`Index: ${formatCurrency(breakdown.index)}`);
  }
  const tierCostsString = tierCostsList.join('<br/>');
  
  let flowchart = `flowchart TD
    Start([Start: ${labelForDisplay}]) --> Inputs["Input Parameters<br/>${hotGB > 0 ? `Hot: ${formatNumber(hotGB)} GB<br/>` : ''}${coldGB > 0 ? `Cold: ${formatNumber(coldGB)} GB<br/>` : ''}${archiveGB > 0 ? `Archive: ${formatNumber(archiveGB)} GB<br/>` : ''}Databases: ${numberOfDatabases}"]
    
    ${storageNodes.join('\n')}
    ${indexNode}
    
    SumTier["Sum Tier Costs<br/>${tierCostsString}<br/>Total: ${formatCurrency(breakdown.total)}<br/>Formula: ${hotGB > 0 ? 'Hot + ' : ''}${coldGB > 0 ? 'Cold + ' : ''}${archiveGB > 0 ? 'Archive' : ''}${storageType === 'data-lake' && breakdown.index && (hotGB > 0 || coldGB > 0) ? ' + Index' : ''}"] --> MultDB["Multiply by numberOfDatabases<br/>Base Cost: ${formatCurrency(breakdown.total)}<br/>Databases: ${numberOfDatabases}<br/>Total: ${formatCurrency(breakdown.total * numberOfDatabases)}<br/>Formula: totalTierCost × numberOfDatabases"]
    
    MultDB --> BaseCost["Base Storage Cost per Month<br/>${formatCurrency(breakdown.total * numberOfDatabases)}"]
    
    ${incrementalCosts ? `
    BaseCost --> IncTierLoop{For Each Tier<br/>Hot, Cold, Archive}
    
    ${provider === 'azure' && transactions && storageType && replication ? generateAzureIncrementalFlowchart(transactions, incrementalCosts, tierAllocation, numberOfDatabases, storageType, replication) : ''}
    ${provider === 'aws' && awsTransactions ? generateAWSIncrementalFlowchart(awsTransactions, incrementalCosts, tierAllocation, numberOfDatabases) : ''}
    
    IncCalc --> CalcFinal["Final Cost<br/>Base: ${formatCurrency(breakdown.total * numberOfDatabases)}<br/>Incremental: ${formatCurrency(incrementalCosts.total)}<br/>Total: ${formatCurrency(breakdown.total * numberOfDatabases + incrementalCosts.total)}<br/>Formula: Base Storage Cost + Total Incremental Cost"]
    ` : `
    BaseCost --> CalcFinal["Final Cost<br/>Base: ${formatCurrency(breakdown.total * numberOfDatabases)}<br/>Incremental: $0.00<br/>Total: ${formatCurrency(breakdown.total * numberOfDatabases)}<br/>Formula: Base Storage Cost + Total Incremental Cost"]
    `}
    
    CalcFinal --> End([End: ${formatCurrency(breakdown.total * numberOfDatabases + (incrementalCosts?.total || 0))} per month])
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style BaseCost fill:#e8f5e9
    style CalcFinal fill:#c8e6c9
    ${incrementalCosts ? 'style IncCalc fill:#fff9c4' : ''}
    ${hotGB > 0 ? 'style CalcHotStorage fill:#e3f2fd' : ''}
    ${coldGB > 0 ? 'style CalcColdStorage fill:#e3f2fd' : ''}
    ${archiveGB > 0 ? 'style CalcArchiveStorage fill:#e3f2fd' : ''}
`;

  return flowchart;
}

function generateAzureIncrementalFlowchart(
  transactions: TransactionInputs,
  incrementalCosts: IncrementalCostBreakdown,
  tierAllocation: TierAllocation,
  numberOfDatabases: number,
  storageType: StorageType,
  replication: ReplicationType
): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };
  
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const config = getPricingConfig(storageType, replication);
  const tiers: StorageTier[] = ['hot', 'cold', 'archive'];
  
  // Calculate actual costs for each tier
  const tierCosts: Record<StorageTier, {
    writeCost: number;
    readCost: number;
    iterReadCost: number;
    iterWriteCost: number;
    otherCost: number;
    archiveReadCost: number;
    transactionTotal: number;
    retrievalCost: number;
    scannedCost: number;
    returnedCost: number;
    queryTotal: number;
    tierTotal: number;
  }> = {
    hot: { writeCost: 0, readCost: 0, iterReadCost: 0, iterWriteCost: 0, otherCost: 0, archiveReadCost: 0, transactionTotal: 0, retrievalCost: 0, scannedCost: 0, returnedCost: 0, queryTotal: 0, tierTotal: 0 },
    cold: { writeCost: 0, readCost: 0, iterReadCost: 0, iterWriteCost: 0, otherCost: 0, archiveReadCost: 0, transactionTotal: 0, retrievalCost: 0, scannedCost: 0, returnedCost: 0, queryTotal: 0, tierTotal: 0 },
    archive: { writeCost: 0, readCost: 0, iterReadCost: 0, iterWriteCost: 0, otherCost: 0, archiveReadCost: 0, transactionTotal: 0, retrievalCost: 0, scannedCost: 0, returnedCost: 0, queryTotal: 0, tierTotal: 0 },
  };

  // Calculate actual costs per tier
  tiers.forEach(tier => {
    const tierPricing = config.tiers[tier];
    const tierTransactions = transactions[tier];
    
    // Transaction costs - only if value > 0
    if (tierTransactions.writeOperations && tierTransactions.writeOperations > 0 && tierPricing.writeOperations) {
      tierCosts[tier].writeCost = (tierTransactions.writeOperations / 10000) * tierPricing.writeOperations;
    }
    if (tierTransactions.readOperations && tierTransactions.readOperations > 0 && tierPricing.readOperations) {
      tierCosts[tier].readCost = (tierTransactions.readOperations / 10000) * tierPricing.readOperations;
    }
    if ((tierTransactions.iterativeReadOperations || 0) > 0 && tierPricing.iterativeReadOperations) {
      tierCosts[tier].iterReadCost = ((tierTransactions.iterativeReadOperations || 0) / 10000) * tierPricing.iterativeReadOperations;
    }
    if ((tierTransactions.iterativeWriteOperations || 0) > 0 && tierPricing.iterativeWriteOperations) {
      tierCosts[tier].iterWriteCost = ((tierTransactions.iterativeWriteOperations || 0) / 100) * tierPricing.iterativeWriteOperations;
    }
    if ((tierTransactions.otherOperations || 0) > 0 && tierPricing.otherOperations) {
      tierCosts[tier].otherCost = ((tierTransactions.otherOperations || 0) / 10000) * tierPricing.otherOperations;
    }
    if (tier === 'archive' && (tierTransactions.archiveHighPriorityRead || 0) > 0 && tierPricing.archiveHighPriorityRead) {
      tierCosts[tier].archiveReadCost = ((tierTransactions.archiveHighPriorityRead || 0) / 10000) * tierPricing.archiveHighPriorityRead;
    }
    tierCosts[tier].transactionTotal = tierCosts[tier].writeCost + tierCosts[tier].readCost + tierCosts[tier].iterReadCost + tierCosts[tier].iterWriteCost + tierCosts[tier].otherCost + tierCosts[tier].archiveReadCost;
    
    // Retrieval costs
    if (tier === 'cold' && (tierTransactions.dataRetrievalGB || 0) > 0 && tierPricing.dataRetrieval) {
      tierCosts[tier].retrievalCost = (tierTransactions.dataRetrievalGB || 0) * tierPricing.dataRetrieval;
    }
    if (tier === 'archive' && ((tierTransactions.archiveHighPriorityRetrievalGB || 0) > 0 || (tierTransactions.dataRetrievalGB || 0) > 0)) {
      if (tierTransactions.archiveHighPriorityRetrievalGB && tierPricing.archiveHighPriorityRetrieval) {
        tierCosts[tier].retrievalCost = (tierTransactions.archiveHighPriorityRetrievalGB || 0) * tierPricing.archiveHighPriorityRetrieval;
      } else if (tierTransactions.dataRetrievalGB && tierPricing.dataRetrieval) {
        tierCosts[tier].retrievalCost = (tierTransactions.dataRetrievalGB || 0) * tierPricing.dataRetrieval;
      }
    }
    
    // Query acceleration (only for hot/cold)
    if (tier !== 'archive') {
      if ((tierTransactions.queryAccelerationScannedGB || 0) > 0 && tierPricing.queryAccelerationScanned) {
        tierCosts[tier].scannedCost = (tierTransactions.queryAccelerationScannedGB || 0) * tierPricing.queryAccelerationScanned;
      }
      if ((tierTransactions.queryAccelerationReturnedGB || 0) > 0 && tierPricing.queryAccelerationReturned) {
        tierCosts[tier].returnedCost = (tierTransactions.queryAccelerationReturnedGB || 0) * tierPricing.queryAccelerationReturned;
      }
      tierCosts[tier].queryTotal = tierCosts[tier].scannedCost + tierCosts[tier].returnedCost;
    }
    
    tierCosts[tier].tierTotal = tierCosts[tier].transactionTotal + tierCosts[tier].retrievalCost + tierCosts[tier].queryTotal;
  });

  const hotTotal = tierCosts.hot.tierTotal;
  const coldTotal = tierCosts.cold.tierTotal;
  const archiveTotal = tierCosts.archive.tierTotal;
  const allTiersTotal = hotTotal + coldTotal + archiveTotal;

  // Build flowchart nodes conditionally - only for non-zero values
  const nodes: string[] = [];
  let currentNode = 'IncTierLoop';
  
  // Helper to add node only if cost > 0
  const addNode = (nodeId: string, label: string, condition: boolean) => {
    if (condition) {
      nodes.push(`    ${currentNode} --> ${nodeId}["${label}"]`);
      currentNode = nodeId;
      return true;
    }
    return false;
  };
  
  // Hot Tier
  const hotNodes: string[] = [];
  let hotCurrent: string | null = 'IncTierLoop';
  
  if (tierCosts.hot.writeCost > 0) {
    hotNodes.push(`    ${hotCurrent} --> CalcWriteHot["Hot Tier - Write Cost<br/>Ops: ${formatNumber(transactions.hot.writeOperations || 0)}<br/>Price: ${config.tiers.hot.writeOperations} per 10k<br/>Cost: ${formatCurrency(tierCosts.hot.writeCost)}<br/>Formula: ops / 10,000 × price"]`);
    hotCurrent = 'CalcWriteHot';
  }
  if (tierCosts.hot.readCost > 0) {
    hotNodes.push(`    ${hotCurrent} --> CalcReadHot["Hot Tier - Read Cost<br/>Ops: ${formatNumber(transactions.hot.readOperations || 0)}<br/>Price: ${config.tiers.hot.readOperations} per 10k<br/>Cost: ${formatCurrency(tierCosts.hot.readCost)}<br/>Formula: ops / 10,000 × price"]`);
    hotCurrent = 'CalcReadHot';
  }
  if (tierCosts.hot.iterReadCost > 0) {
    hotNodes.push(`    ${hotCurrent} --> CalcIterReadHot["Hot Tier - Iter Read Cost<br/>Ops: ${formatNumber(transactions.hot.iterativeReadOperations || 0)}<br/>Price: ${config.tiers.hot.iterativeReadOperations} per 10k<br/>Cost: ${formatCurrency(tierCosts.hot.iterReadCost)}<br/>Formula: ops / 10,000 × price"]`);
    hotCurrent = 'CalcIterReadHot';
  }
  if (tierCosts.hot.iterWriteCost > 0) {
    hotNodes.push(`    ${hotCurrent} --> CalcIterWriteHot["Hot Tier - Iter Write Cost<br/>Ops: ${formatNumber(transactions.hot.iterativeWriteOperations || 0)}<br/>Price: ${config.tiers.hot.iterativeWriteOperations} per 100<br/>Cost: ${formatCurrency(tierCosts.hot.iterWriteCost)}<br/>Formula: ops / 100 × price"]`);
    hotCurrent = 'CalcIterWriteHot';
  }
  if (tierCosts.hot.otherCost > 0) {
    hotNodes.push(`    ${hotCurrent} --> CalcOtherHot["Hot Tier - Other Cost<br/>Ops: ${formatNumber(transactions.hot.otherOperations || 0)}<br/>Price: ${config.tiers.hot.otherOperations} per 10k<br/>Cost: ${formatCurrency(tierCosts.hot.otherCost)}<br/>Formula: ops / 10,000 × price"]`);
    hotCurrent = 'CalcOtherHot';
  }
  
  if (tierCosts.hot.transactionTotal > 0) {
    hotNodes.push(`    ${hotCurrent} --> SumTransHot["Hot Tier - Sum Transactions<br/>Total: ${formatCurrency(tierCosts.hot.transactionTotal)}"]`);
    hotCurrent = 'SumTransHot';
  }
  
  if (tierCosts.hot.scannedCost > 0) {
    hotNodes.push(`    ${hotCurrent} --> CalcScannedHot["Hot Tier - Query Scanned Cost<br/>GB: ${formatNumber(transactions.hot.queryAccelerationScannedGB || 0)}<br/>Price: ${config.tiers.hot.queryAccelerationScanned} per GB<br/>Cost: ${formatCurrency(tierCosts.hot.scannedCost)}<br/>Formula: GB × price"]`);
    hotCurrent = 'CalcScannedHot';
  }
  if (tierCosts.hot.returnedCost > 0) {
    hotNodes.push(`    ${hotCurrent} --> CalcReturnedHot["Hot Tier - Query Returned Cost<br/>GB: ${formatNumber(transactions.hot.queryAccelerationReturnedGB || 0)}<br/>Price: ${config.tiers.hot.queryAccelerationReturned} per GB<br/>Cost: ${formatCurrency(tierCosts.hot.returnedCost)}<br/>Formula: GB × price"]`);
    hotCurrent = 'CalcReturnedHot';
  }
  if (tierCosts.hot.queryTotal > 0) {
    hotNodes.push(`    ${hotCurrent} --> SumQueryHot["Hot Tier - Sum Query<br/>Total: ${formatCurrency(tierCosts.hot.queryTotal)}"]`);
    hotCurrent = 'SumQueryHot';
  }
  
  if (hotTotal > 0) {
    hotNodes.push(`    ${hotCurrent} --> TierTotalHot["Hot Tier Total<br/>${tierCosts.hot.transactionTotal > 0 ? `Trans: ${formatCurrency(tierCosts.hot.transactionTotal)}<br/>` : ''}${tierCosts.hot.queryTotal > 0 ? `Query: ${formatCurrency(tierCosts.hot.queryTotal)}<br/>` : ''}Total: ${formatCurrency(hotTotal)}"]`);
    hotCurrent = 'TierTotalHot';
  } else {
    hotCurrent = null;
  }
  
  // Cold Tier
  const coldNodes: string[] = [];
  let coldCurrent: string | null = hotCurrent || 'IncTierLoop';
  
  if (tierCosts.cold.writeCost > 0) {
    coldNodes.push(`    ${coldCurrent} --> CalcWriteCold["Cold Tier - Write Cost<br/>Ops: ${formatNumber(transactions.cold.writeOperations || 0)}<br/>Price: ${config.tiers.cold.writeOperations} per 10k<br/>Cost: ${formatCurrency(tierCosts.cold.writeCost)}"]`);
    coldCurrent = 'CalcWriteCold';
  }
  if (tierCosts.cold.readCost > 0) {
    coldNodes.push(`    ${coldCurrent} --> CalcReadCold["Cold Tier - Read Cost<br/>Ops: ${formatNumber(transactions.cold.readOperations || 0)}<br/>Price: ${config.tiers.cold.readOperations} per 10k<br/>Cost: ${formatCurrency(tierCosts.cold.readCost)}"]`);
    coldCurrent = 'CalcReadCold';
  }
  if (tierCosts.cold.iterWriteCost > 0) {
    coldNodes.push(`    ${coldCurrent} --> CalcIterWriteCold["Cold Tier - Iter Write Cost<br/>Ops: ${formatNumber(transactions.cold.iterativeWriteOperations || 0)}<br/>Price: ${config.tiers.cold.iterativeWriteOperations} per 100<br/>Cost: ${formatCurrency(tierCosts.cold.iterWriteCost)}"]`);
    coldCurrent = 'CalcIterWriteCold';
  }
  
  if (tierCosts.cold.transactionTotal > 0) {
    coldNodes.push(`    ${coldCurrent} --> SumTransCold["Cold Tier - Sum Transactions<br/>Total: ${formatCurrency(tierCosts.cold.transactionTotal)}"]`);
    coldCurrent = 'SumTransCold';
  }
  
  if (tierCosts.cold.retrievalCost > 0) {
    coldNodes.push(`    ${coldCurrent} --> CalcColdRet["Cold Tier - Retrieval Cost<br/>GB: ${formatNumber(transactions.cold.dataRetrievalGB || 0)}<br/>Price: ${config.tiers.cold.dataRetrieval} per GB<br/>Cost: ${formatCurrency(tierCosts.cold.retrievalCost)}<br/>Formula: GB × price"]`);
    coldCurrent = 'CalcColdRet';
  }
  
  if (tierCosts.cold.scannedCost > 0) {
    coldNodes.push(`    ${coldCurrent} --> CalcScannedCold["Cold Tier - Query Scanned Cost<br/>GB: ${formatNumber(transactions.cold.queryAccelerationScannedGB || 0)}<br/>Price: ${config.tiers.cold.queryAccelerationScanned} per GB<br/>Cost: ${formatCurrency(tierCosts.cold.scannedCost)}"]`);
    coldCurrent = 'CalcScannedCold';
  }
  if (tierCosts.cold.returnedCost > 0) {
    coldNodes.push(`    ${coldCurrent} --> CalcReturnedCold["Cold Tier - Query Returned Cost<br/>GB: ${formatNumber(transactions.cold.queryAccelerationReturnedGB || 0)}<br/>Price: ${config.tiers.cold.queryAccelerationReturned} per GB<br/>Cost: ${formatCurrency(tierCosts.cold.returnedCost)}"]`);
    coldCurrent = 'CalcReturnedCold';
  }
  if (tierCosts.cold.queryTotal > 0) {
    coldNodes.push(`    ${coldCurrent} --> SumQueryCold["Cold Tier - Sum Query<br/>Total: ${formatCurrency(tierCosts.cold.queryTotal)}"]`);
    coldCurrent = 'SumQueryCold';
  }
  
  if (coldTotal > 0) {
    coldNodes.push(`    ${coldCurrent} --> TierTotalCold["Cold Tier Total<br/>${tierCosts.cold.transactionTotal > 0 ? `Trans: ${formatCurrency(tierCosts.cold.transactionTotal)}<br/>` : ''}${tierCosts.cold.retrievalCost > 0 ? `Retrieval: ${formatCurrency(tierCosts.cold.retrievalCost)}<br/>` : ''}${tierCosts.cold.queryTotal > 0 ? `Query: ${formatCurrency(tierCosts.cold.queryTotal)}<br/>` : ''}Total: ${formatCurrency(coldTotal)}"]`);
    coldCurrent = 'TierTotalCold';
  } else {
    coldCurrent = null;
  }
  
  // Archive Tier
  const archiveNodes: string[] = [];
  let archiveCurrent: string | null = coldCurrent || hotCurrent || 'IncTierLoop';
  
  if (tierCosts.archive.writeCost > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> CalcWriteArchive["Archive Tier - Write Cost<br/>Ops: ${formatNumber(transactions.archive.writeOperations || 0)}<br/>Price: ${config.tiers.archive.writeOperations} per 10k<br/>Cost: ${formatCurrency(tierCosts.archive.writeCost)}"]`);
    archiveCurrent = 'CalcWriteArchive';
  }
  if (tierCosts.archive.readCost > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> CalcReadArchive["Archive Tier - Read Cost<br/>Ops: ${formatNumber(transactions.archive.readOperations || 0)}<br/>Price: ${config.tiers.archive.readOperations} per 10k<br/>Cost: ${formatCurrency(tierCosts.archive.readCost)}"]`);
    archiveCurrent = 'CalcReadArchive';
  }
  if (tierCosts.archive.iterWriteCost > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> CalcIterWriteArchive["Archive Tier - Iter Write Cost<br/>Ops: ${formatNumber(transactions.archive.iterativeWriteOperations || 0)}<br/>Price: ${config.tiers.archive.iterativeWriteOperations} per 100<br/>Cost: ${formatCurrency(tierCosts.archive.iterWriteCost)}"]`);
    archiveCurrent = 'CalcIterWriteArchive';
  }
  if (tierCosts.archive.archiveReadCost > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> CalcArchiveRead["Archive Tier - High Priority Read<br/>Ops: ${formatNumber(transactions.archive.archiveHighPriorityRead || 0)}<br/>Price: ${config.tiers.archive.archiveHighPriorityRead} per 10k<br/>Cost: ${formatCurrency(tierCosts.archive.archiveReadCost)}<br/>Formula: ops / 10,000 × price"]`);
    archiveCurrent = 'CalcArchiveRead';
  }
  
  if (tierCosts.archive.transactionTotal > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> SumTransArchive["Archive Tier - Sum Transactions<br/>Total: ${formatCurrency(tierCosts.archive.transactionTotal)}"]`);
    archiveCurrent = 'SumTransArchive';
  }
  
  if (tierCosts.archive.retrievalCost > 0) {
    const archiveRetrievalGB = transactions.archive.archiveHighPriorityRetrievalGB || transactions.archive.dataRetrievalGB || 0;
    archiveNodes.push(`    ${archiveCurrent} --> CalcArchiveRet["Archive Tier - Retrieval Cost<br/>GB: ${formatNumber(archiveRetrievalGB)}<br/>Price: ${config.tiers.archive.archiveHighPriorityRetrieval || config.tiers.archive.dataRetrieval || 0} per GB<br/>Cost: ${formatCurrency(tierCosts.archive.retrievalCost)}<br/>Formula: GB × price"]`);
    archiveCurrent = 'CalcArchiveRet';
  }
  
  if (archiveTotal > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> TierTotalArchive["Archive Tier Total<br/>${tierCosts.archive.transactionTotal > 0 ? `Trans: ${formatCurrency(tierCosts.archive.transactionTotal)}<br/>` : ''}${tierCosts.archive.retrievalCost > 0 ? `Retrieval: ${formatCurrency(tierCosts.archive.retrievalCost)}<br/>` : ''}Total: ${formatCurrency(archiveTotal)}"]`);
    archiveCurrent = 'TierTotalArchive';
  } else {
    archiveCurrent = null;
  }
  
  // Sum All Tiers - only if we have at least one tier total
  const sumAllTiersNode = (hotTotal > 0 || coldTotal > 0 || archiveTotal > 0) ? `
    ${hotTotal > 0 ? 'TierTotalHot --> SumAllTiers' : ''}
    ${coldTotal > 0 ? 'TierTotalCold --> SumAllTiers' : ''}
    ${archiveTotal > 0 ? 'TierTotalArchive --> SumAllTiers' : ''}
    SumAllTiers["Sum All Tiers<br/>${hotTotal > 0 ? `Hot: ${formatCurrency(hotTotal)}<br/>` : ''}${coldTotal > 0 ? `Cold: ${formatCurrency(coldTotal)}<br/>` : ''}${archiveTotal > 0 ? `Archive: ${formatCurrency(archiveTotal)}<br/>` : ''}Total: ${formatCurrency(allTiersTotal)}"] --> MultDBInc["Multiply by numberOfDatabases<br/>Per DB: ${formatCurrency(allTiersTotal)}<br/>Databases: ${numberOfDatabases}<br/>Total: ${formatCurrency(allTiersTotal * numberOfDatabases)}<br/>Formula: allTiersTotal × numberOfDatabases"]
    MultDBInc --> IncCalc["Total Incremental Cost<br/>${formatCurrency(incrementalCosts.total)}"]
  ` : `
    IncTierLoop --> IncCalc["Total Incremental Cost<br/>${formatCurrency(incrementalCosts.total)}"]
  `;
  
  return `
    ${hotNodes.join('\n')}
    ${coldNodes.join('\n')}
    ${archiveNodes.join('\n')}
    ${sumAllTiersNode}
  `;
}

function generateAWSIncrementalFlowchart(
  awsTransactions: AWSTransactionInputs,
  incrementalCosts: IncrementalCostBreakdown,
  tierAllocation: TierAllocation,
  numberOfDatabases: number
): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };
  
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const config = getAWSPricingConfig();
  const tiers: StorageTier[] = ['hot', 'cold', 'archive'];
  
  // Calculate actual costs for each tier
  const tierCosts: Record<StorageTier, {
    putCost: number;
    getCost: number;
    requestTotal: number;
    retrievalCost: number;
    earlyDelCost: number;
    tierTotal: number;
  }> = {
    hot: { putCost: 0, getCost: 0, requestTotal: 0, retrievalCost: 0, earlyDelCost: 0, tierTotal: 0 },
    cold: { putCost: 0, getCost: 0, requestTotal: 0, retrievalCost: 0, earlyDelCost: 0, tierTotal: 0 },
    archive: { putCost: 0, getCost: 0, requestTotal: 0, retrievalCost: 0, earlyDelCost: 0, tierTotal: 0 },
  };

  // Calculate actual costs per tier
  tiers.forEach(tier => {
    const tierPricing = config.tiers[tier];
    const sizeGB = tierAllocation[tier];
    const tierTransactions = awsTransactions[tier];
    
    // Request costs - only if value > 0
    if (tierTransactions.putCopyPostListRequests && tierTransactions.putCopyPostListRequests > 0 && tierPricing.putCopyPostListRequests) {
      tierCosts[tier].putCost = (tierTransactions.putCopyPostListRequests / 1000) * tierPricing.putCopyPostListRequests;
    }
    if (tierTransactions.getSelectRequests && tierTransactions.getSelectRequests > 0 && tierPricing.getSelectRequests) {
      tierCosts[tier].getCost = (tierTransactions.getSelectRequests / 1000) * tierPricing.getSelectRequests;
    }
    tierCosts[tier].requestTotal = tierCosts[tier].putCost + tierCosts[tier].getCost;
    
    // Retrieval costs
    if (tierTransactions.dataRetrievalGB && tierTransactions.dataRetrievalGB > 0) {
      if (tier === 'cold' && tierPricing.dataRetrieval?.standard) {
        tierCosts[tier].retrievalCost = tierTransactions.dataRetrievalGB * tierPricing.dataRetrieval.standard;
      } else if (tier === 'archive' && tierPricing.dataRetrieval) {
        const retrievalType = tierTransactions.retrievalType || 'standard';
        const retrievalPrice = tierPricing.dataRetrieval[retrievalType as keyof typeof tierPricing.dataRetrieval];
        if (retrievalPrice) {
          tierCosts[tier].retrievalCost = tierTransactions.dataRetrievalGB * retrievalPrice;
        }
        // Add retrieval request cost for Glacier
        if (tierTransactions.dataRetrievalRequests && tierTransactions.dataRetrievalRequests > 0 && tierPricing.dataRetrievalRequests) {
          const requestPrice = tierPricing.dataRetrievalRequests[retrievalType as keyof typeof tierPricing.dataRetrievalRequests];
          if (requestPrice) {
            tierCosts[tier].retrievalCost += (tierTransactions.dataRetrievalRequests / 1000) * requestPrice;
          }
        }
      }
    }
    
    // Early deletion
    if (tierPricing.minimumStorageDurationDays && tierTransactions.storageDurationDays) {
      const remainingDays = tierPricing.minimumStorageDurationDays - tierTransactions.storageDurationDays;
      if (remainingDays > 0 && tierPricing.earlyDeletionPenalty) {
        tierCosts[tier].earlyDelCost = sizeGB * tierPricing.earlyDeletionPenalty * (remainingDays / tierPricing.minimumStorageDurationDays);
      }
    }
    
    tierCosts[tier].tierTotal = tierCosts[tier].requestTotal + tierCosts[tier].retrievalCost + tierCosts[tier].earlyDelCost;
  });

  const hotTotal = tierCosts.hot.tierTotal;
  const coldTotal = tierCosts.cold.tierTotal;
  const archiveTotal = tierCosts.archive.tierTotal;
  const allTiersTotal = hotTotal + coldTotal + archiveTotal;

  // Build nodes conditionally
  const hotNodes: string[] = [];
  let hotCurrent: string | null = 'IncTierLoop';
  
  if (tierCosts.hot.putCost > 0) {
    hotNodes.push(`    ${hotCurrent} --> CalcPutHot["Hot Tier - PUT/COPY/POST/LIST Cost<br/>Requests: ${formatNumber(awsTransactions.hot.putCopyPostListRequests || 0)}<br/>Price: ${config.tiers.hot.putCopyPostListRequests} per 1k<br/>Cost: ${formatCurrency(tierCosts.hot.putCost)}<br/>Formula: requests / 1,000 × price"]`);
    hotCurrent = 'CalcPutHot';
  }
  if (tierCosts.hot.getCost > 0) {
    hotNodes.push(`    ${hotCurrent} --> CalcGetHot["Hot Tier - GET/SELECT Cost<br/>Requests: ${formatNumber(awsTransactions.hot.getSelectRequests || 0)}<br/>Price: ${config.tiers.hot.getSelectRequests} per 1k<br/>Cost: ${formatCurrency(tierCosts.hot.getCost)}<br/>Formula: requests / 1,000 × price"]`);
    hotCurrent = 'CalcGetHot';
  }
  
  if (hotTotal > 0) {
    hotNodes.push(`    ${hotCurrent} --> TierTotalHot["Hot Tier Total<br/>Requests: ${formatCurrency(tierCosts.hot.requestTotal)}<br/>Total: ${formatCurrency(hotTotal)}"]`);
    hotCurrent = 'TierTotalHot';
  } else {
    hotCurrent = null;
  }
  
  const coldNodes: string[] = [];
  let coldCurrent: string | null = hotCurrent || 'IncTierLoop';
  
  if (tierCosts.cold.putCost > 0) {
    coldNodes.push(`    ${coldCurrent} --> CalcPutCold["Cold Tier - PUT/COPY/POST/LIST Cost<br/>Requests: ${formatNumber(awsTransactions.cold.putCopyPostListRequests || 0)}<br/>Price: ${config.tiers.cold.putCopyPostListRequests} per 1k<br/>Cost: ${formatCurrency(tierCosts.cold.putCost)}"]`);
    coldCurrent = 'CalcPutCold';
  }
  if (tierCosts.cold.getCost > 0) {
    coldNodes.push(`    ${coldCurrent} --> CalcGetCold["Cold Tier - GET/SELECT Cost<br/>Requests: ${formatNumber(awsTransactions.cold.getSelectRequests || 0)}<br/>Price: ${config.tiers.cold.getSelectRequests} per 1k<br/>Cost: ${formatCurrency(tierCosts.cold.getCost)}"]`);
    coldCurrent = 'CalcGetCold';
  }
  
  if (tierCosts.cold.requestTotal > 0) {
    coldNodes.push(`    ${coldCurrent} --> SumRequestsCold["Cold Tier - Sum Requests<br/>Total: ${formatCurrency(tierCosts.cold.requestTotal)}"]`);
    coldCurrent = 'SumRequestsCold';
  }
  
  if (tierCosts.cold.retrievalCost > 0) {
    coldNodes.push(`    ${coldCurrent} --> CalcColdRet["Cold Tier - Retrieval Cost<br/>GB: ${formatNumber(awsTransactions.cold.dataRetrievalGB || 0)}<br/>Price: ${config.tiers.cold.dataRetrieval?.standard || 0} per GB<br/>Cost: ${formatCurrency(tierCosts.cold.retrievalCost)}<br/>Formula: GB × price"]`);
    coldCurrent = 'CalcColdRet';
  }
  
  if (coldTotal > 0) {
    coldNodes.push(`    ${coldCurrent} --> TierTotalCold["Cold Tier Total<br/>${tierCosts.cold.requestTotal > 0 ? `Requests: ${formatCurrency(tierCosts.cold.requestTotal)}<br/>` : ''}${tierCosts.cold.retrievalCost > 0 ? `Retrieval: ${formatCurrency(tierCosts.cold.retrievalCost)}<br/>` : ''}Total: ${formatCurrency(coldTotal)}"]`);
    coldCurrent = 'TierTotalCold';
  } else {
    coldCurrent = null;
  }
  
  const archiveNodes: string[] = [];
  let archiveCurrent: string | null = coldCurrent || hotCurrent || 'IncTierLoop';
  
  if (tierCosts.archive.putCost > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> CalcPutArchive["Archive Tier - PUT/COPY/POST/LIST Cost<br/>Requests: ${formatNumber(awsTransactions.archive.putCopyPostListRequests || 0)}<br/>Price: ${config.tiers.archive.putCopyPostListRequests} per 1k<br/>Cost: ${formatCurrency(tierCosts.archive.putCost)}"]`);
    archiveCurrent = 'CalcPutArchive';
  }
  if (tierCosts.archive.getCost > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> CalcGetArchive["Archive Tier - GET/SELECT Cost<br/>Requests: ${formatNumber(awsTransactions.archive.getSelectRequests || 0)}<br/>Price: ${config.tiers.archive.getSelectRequests} per 1k<br/>Cost: ${formatCurrency(tierCosts.archive.getCost)}"]`);
    archiveCurrent = 'CalcGetArchive';
  }
  
  if (tierCosts.archive.requestTotal > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> SumRequestsArchive["Archive Tier - Sum Requests<br/>Total: ${formatCurrency(tierCosts.archive.requestTotal)}"]`);
    archiveCurrent = 'SumRequestsArchive';
  }
  
  if (tierCosts.archive.retrievalCost > 0) {
    const archiveRetrievalType = awsTransactions.archive.retrievalType || 'standard';
    archiveNodes.push(`    ${archiveCurrent} --> CalcArchiveRet["Archive Tier - Retrieval Cost<br/>GB: ${formatNumber(awsTransactions.archive.dataRetrievalGB || 0)}<br/>Type: ${archiveRetrievalType}<br/>Price: ${config.tiers.archive.dataRetrieval?.[archiveRetrievalType as keyof typeof config.tiers.archive.dataRetrieval] || 0} per GB<br/>Cost: ${formatCurrency(tierCosts.archive.retrievalCost)}<br/>Formula: GB × price"]`);
    archiveCurrent = 'CalcArchiveRet';
  }
  
  if (tierCosts.archive.earlyDelCost > 0) {
    const remainingDays = config.tiers.archive.minimumStorageDurationDays && awsTransactions.archive.storageDurationDays 
      ? (config.tiers.archive.minimumStorageDurationDays - awsTransactions.archive.storageDurationDays) 
      : 'N/A';
    archiveNodes.push(`    ${archiveCurrent} --> CalcEarlyDel["Archive Tier - Early Deletion<br/>Size: ${formatNumber(tierAllocation.archive)} GB<br/>Remaining Days: ${remainingDays}<br/>Penalty: ${config.tiers.archive.earlyDeletionPenalty || 0} per GB<br/>Cost: ${formatCurrency(tierCosts.archive.earlyDelCost)}<br/>Formula: sizeGB × penalty × remainingDays / minDays"]`);
    archiveCurrent = 'CalcEarlyDel';
  }
  
  if (archiveTotal > 0) {
    archiveNodes.push(`    ${archiveCurrent} --> TierTotalArchive["Archive Tier Total<br/>${tierCosts.archive.requestTotal > 0 ? `Requests: ${formatCurrency(tierCosts.archive.requestTotal)}<br/>` : ''}${tierCosts.archive.retrievalCost > 0 ? `Retrieval: ${formatCurrency(tierCosts.archive.retrievalCost)}<br/>` : ''}${tierCosts.archive.earlyDelCost > 0 ? `Early Del: ${formatCurrency(tierCosts.archive.earlyDelCost)}<br/>` : ''}Total: ${formatCurrency(archiveTotal)}"]`);
    archiveCurrent = 'TierTotalArchive';
  } else {
    archiveCurrent = null;
  }
  
  // Sum All Tiers
  const sumAllTiersNode = (hotTotal > 0 || coldTotal > 0 || archiveTotal > 0) ? `
    ${hotTotal > 0 ? 'TierTotalHot --> SumAllTiers' : ''}
    ${coldTotal > 0 ? 'TierTotalCold --> SumAllTiers' : ''}
    ${archiveTotal > 0 ? 'TierTotalArchive --> SumAllTiers' : ''}
    SumAllTiers["Sum All Tiers<br/>${hotTotal > 0 ? `Hot: ${formatCurrency(hotTotal)}<br/>` : ''}${coldTotal > 0 ? `Cold: ${formatCurrency(coldTotal)}<br/>` : ''}${archiveTotal > 0 ? `Archive: ${formatCurrency(archiveTotal)}<br/>` : ''}Total: ${formatCurrency(allTiersTotal)}"] --> MultDBInc["Multiply by numberOfDatabases<br/>Per DB: ${formatCurrency(allTiersTotal)}<br/>Databases: ${numberOfDatabases}<br/>Total: ${formatCurrency(allTiersTotal * numberOfDatabases)}<br/>Formula: allTiersTotal × numberOfDatabases"]
    MultDBInc --> IncCalc["Total Incremental Cost<br/>${formatCurrency(incrementalCosts.total)}"]
  ` : `
    IncTierLoop --> IncCalc["Total Incremental Cost<br/>${formatCurrency(incrementalCosts.total)}"]
  `;
  
  return `
    ${hotNodes.join('\n')}
    ${coldNodes.join('\n')}
    ${archiveNodes.join('\n')}
    ${sumAllTiersNode}
  `;
}
