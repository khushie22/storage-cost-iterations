/**
 * Flowchart Visualizer Script
 * Helps visualize and test the calculation flow logic
 * Generates Mermaid flowchart and saves as image
 * Run with: node scripts/flowchart-visualizer.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mock data for testing
const mockInputs = {
  totalSizeGB: 1000,
  tierAllocation: {
    hot: 600,    // 60%
    cold: 300,   // 30%
    archive: 100 // 10%
  },
  numberOfDatabases: 5,
  azureTransactions: {
    monthlyReadGB: 100,
    monthlyWriteGB: 50,
    readOperations: 50000,        // per 10,000
    writeOperations: 30000,       // per 10,000
    queryAccelerationScannedGB: 200,
    queryAccelerationReturnedGB: 50,
    archiveHighPriorityRead: 1000, // per 10,000
    archiveHighPriorityRetrievalGB: 20,
    iterativeReadOperations: 5000, // per 10,000
    iterativeWriteOperations: 200, // per 100
    otherOperations: 10000         // per 10,000
  },
  awsTransactions: {
    putCopyPostListRequests: 50000,  // per 1,000
    getSelectRequests: 100000,       // per 1,000
    dataRetrievalGB: 50,
    dataRetrievalRequests: 1000,     // per 1,000
    retrievalType: 'standard',       // 'standard' or 'expedited'
    storageDurationDays: 60           // for early deletion
  }
};

// Storage options
const STORAGE_OPTIONS = [
  { name: 'Azure Data Lake Storage (LRS)', type: 'data-lake', replication: 'LRS' },
  { name: 'Azure Data Lake Storage (GRS)', type: 'data-lake', replication: 'GRS' },
  { name: 'Azure Blob Storage (LRS)', type: 'blob', replication: 'LRS' },
  { name: 'Azure Blob Storage (GRS)', type: 'blob', replication: 'GRS' },
  { name: 'AWS S3', type: 'aws' }
];

// Flowchart steps tracker
class FlowTracker {
  constructor() {
    this.steps = [];
    this.currentPath = [];
  }

  log(step, details = {}) {
    this.steps.push({
      step,
      details,
      timestamp: new Date().toISOString()
    });
    this.currentPath.push(step);
  }

  printFlow() {
    console.log('\n=== CALCULATION FLOW ===\n');
    this.steps.forEach((s, i) => {
      console.log(`${i + 1}. ${s.step}`);
      if (Object.keys(s.details).length > 0) {
        console.log(`   Details:`, s.details);
      }
    });
  }

  printSummary() {
    console.log('\n=== FLOW SUMMARY ===\n');
    console.log(`Total Steps: ${this.steps.length}`);
    console.log(`Path: ${this.currentPath.join(' → ')}`);
  }
}

// Simulate Azure incremental cost calculation
function simulateAzureIncrementalCosts(tracker, transactions, tier, tierPricing) {
  tracker.log(`Calculate Incremental Costs for ${tier} tier (Azure)`);
  
  let transactionCost = 0;
  let retrievalCost = 0;
  let queryCost = 0;

  // Transaction costs
  tracker.log(`Check Transaction Parameters for ${tier} tier`);
  
  if (transactions.writeOperations > 0 && tierPricing.writeOperations) {
    const cost = (transactions.writeOperations / 10000) * tierPricing.writeOperations;
    transactionCost += cost;
    tracker.log(`✓ Write Operations: ${transactions.writeOperations} → $${cost.toFixed(4)}`, {
      calculation: `(${transactions.writeOperations} / 10,000) × $${tierPricing.writeOperations}`
    });
  }

  if (transactions.readOperations > 0 && tierPricing.readOperations) {
    const cost = (transactions.readOperations / 10000) * tierPricing.readOperations;
    transactionCost += cost;
    tracker.log(`✓ Read Operations: ${transactions.readOperations} → $${cost.toFixed(4)}`, {
      calculation: `(${transactions.readOperations} / 10,000) × $${tierPricing.readOperations}`
    });
  }

  if (transactions.iterativeReadOperations && tierPricing.iterativeReadOperations) {
    const cost = (transactions.iterativeReadOperations / 10000) * tierPricing.iterativeReadOperations;
    transactionCost += cost;
    tracker.log(`✓ Iterative Read: ${transactions.iterativeReadOperations} → $${cost.toFixed(4)}`);
  }

  if (transactions.iterativeWriteOperations && tierPricing.iterativeWriteOperations) {
    const cost = (transactions.iterativeWriteOperations / 100) * tierPricing.iterativeWriteOperations;
    transactionCost += cost;
    tracker.log(`✓ Iterative Write: ${transactions.iterativeWriteOperations} → $${cost.toFixed(4)}`, {
      calculation: `(${transactions.iterativeWriteOperations} / 100) × $${tierPricing.iterativeWriteOperations}`
    });
  }

  if (transactions.otherOperations && tierPricing.otherOperations) {
    const cost = (transactions.otherOperations / 10000) * tierPricing.otherOperations;
    transactionCost += cost;
    tracker.log(`✓ Other Operations: ${transactions.otherOperations} → $${cost.toFixed(4)}`);
  }

  if (tier === 'archive' && transactions.archiveHighPriorityRead && tierPricing.archiveHighPriorityRead) {
    const cost = (transactions.archiveHighPriorityRead / 10000) * tierPricing.archiveHighPriorityRead;
    transactionCost += cost;
    tracker.log(`✓ Archive High Priority Read: ${transactions.archiveHighPriorityRead} → $${cost.toFixed(4)}`);
  }

  // Retrieval costs
  if (tier === 'cold' || tier === 'archive') {
    tracker.log(`Calculate Retrieval Costs for ${tier} tier`);
    
    if (tier === 'cold' && transactions.monthlyReadGB > 0 && tierPricing.dataRetrieval) {
      retrievalCost = transactions.monthlyReadGB * tierPricing.dataRetrieval;
      tracker.log(`✓ Cold Retrieval: ${transactions.monthlyReadGB} GB → $${retrievalCost.toFixed(4)}`);
    }
    
    if (tier === 'archive' && transactions.archiveHighPriorityRetrievalGB > 0) {
      if (tierPricing.archiveHighPriorityRetrieval) {
        retrievalCost = transactions.archiveHighPriorityRetrievalGB * tierPricing.archiveHighPriorityRetrieval;
        tracker.log(`✓ Archive High Priority Retrieval: ${transactions.archiveHighPriorityRetrievalGB} GB → $${retrievalCost.toFixed(4)}`);
      } else if (tierPricing.dataRetrieval) {
        retrievalCost = transactions.archiveHighPriorityRetrievalGB * tierPricing.dataRetrieval;
        tracker.log(`✓ Archive Standard Retrieval: ${transactions.archiveHighPriorityRetrievalGB} GB → $${retrievalCost.toFixed(4)}`);
      }
    }
  }

  // Query acceleration (only for hot/cold)
  if (tier === 'hot' || tier === 'cold') {
    tracker.log(`Calculate Query Acceleration for ${tier} tier`);
    
    if (transactions.queryAccelerationScannedGB && tierPricing.queryAccelerationScanned) {
      const scannedCost = transactions.queryAccelerationScannedGB * tierPricing.queryAccelerationScanned;
      queryCost += scannedCost;
      tracker.log(`✓ Query Scanned: ${transactions.queryAccelerationScannedGB} GB → $${scannedCost.toFixed(4)}`);
    }
    
    if (transactions.queryAccelerationReturnedGB && tierPricing.queryAccelerationReturned) {
      const returnedCost = transactions.queryAccelerationReturnedGB * tierPricing.queryAccelerationReturned;
      queryCost += returnedCost;
      tracker.log(`✓ Query Returned: ${transactions.queryAccelerationReturnedGB} GB → $${returnedCost.toFixed(4)}`);
    }
  }

  const tierTotal = transactionCost + retrievalCost + queryCost;
  tracker.log(`Total for ${tier} tier: $${tierTotal.toFixed(4)}`, {
    transactions: transactionCost,
    retrieval: retrievalCost,
    query: queryCost
  });

  return {
    transactions: transactionCost,
    retrieval: retrievalCost,
    queryAcceleration: queryCost,
    total: tierTotal
  };
}

// Simulate AWS incremental cost calculation
function simulateAWSIncrementalCosts(tracker, awsTransactions, tier, tierPricing, sizeGB) {
  tracker.log(`Calculate Incremental Costs for ${tier} tier (AWS)`);
  
  let requestCost = 0;
  let retrievalCost = 0;
  let earlyDeletionCost = 0;

  // Request costs
  tracker.log(`Calculate Request Costs for ${tier} tier`);
  
  if (awsTransactions.putCopyPostListRequests && tierPricing.putCopyPostListRequests) {
    const cost = (awsTransactions.putCopyPostListRequests / 1000) * tierPricing.putCopyPostListRequests;
    requestCost += cost;
    tracker.log(`✓ PUT/COPY/POST/LIST: ${awsTransactions.putCopyPostListRequests} → $${cost.toFixed(4)}`);
  }

  if (awsTransactions.getSelectRequests && tierPricing.getSelectRequests) {
    const cost = (awsTransactions.getSelectRequests / 1000) * tierPricing.getSelectRequests;
    requestCost += cost;
    tracker.log(`✓ GET/SELECT: ${awsTransactions.getSelectRequests} → $${cost.toFixed(4)}`);
  }

  // Retrieval costs
  if ((tier === 'cold' || tier === 'archive') && awsTransactions.dataRetrievalGB > 0) {
    tracker.log(`Calculate Retrieval Costs for ${tier} tier`);
    
    if (tier === 'cold' && tierPricing.dataRetrieval?.standard) {
      retrievalCost = awsTransactions.dataRetrievalGB * tierPricing.dataRetrieval.standard;
      tracker.log(`✓ Cold Retrieval: ${awsTransactions.dataRetrievalGB} GB → $${retrievalCost.toFixed(4)}`);
    }
    
    if (tier === 'archive' && tierPricing.dataRetrieval) {
      const retrievalType = awsTransactions.retrievalType || 'standard';
      const gbPrice = tierPricing.dataRetrieval[retrievalType];
      
      if (gbPrice) {
        const gbCost = awsTransactions.dataRetrievalGB * gbPrice;
        retrievalCost += gbCost;
        tracker.log(`✓ Archive ${retrievalType} Retrieval GB: ${awsTransactions.dataRetrievalGB} GB → $${gbCost.toFixed(4)}`);
        
        // Request cost for archive
        if (awsTransactions.dataRetrievalRequests && tierPricing.dataRetrievalRequests) {
          const reqPrice = tierPricing.dataRetrievalRequests[retrievalType];
          if (reqPrice) {
            const reqCost = (awsTransactions.dataRetrievalRequests / 1000) * reqPrice;
            retrievalCost += reqCost;
            tracker.log(`✓ Archive ${retrievalType} Retrieval Requests: ${awsTransactions.dataRetrievalRequests} → $${reqCost.toFixed(4)}`);
          }
        }
      }
    }
  }

  // Early deletion
  if (tierPricing.minimumStorageDurationDays && awsTransactions.storageDurationDays) {
    tracker.log(`Check Early Deletion for ${tier} tier`);
    const remainingDays = tierPricing.minimumStorageDurationDays - awsTransactions.storageDurationDays;
    
    if (remainingDays > 0 && tierPricing.earlyDeletionPenalty) {
      earlyDeletionCost = sizeGB * tierPricing.earlyDeletionPenalty * (remainingDays / tierPricing.minimumStorageDurationDays);
      tracker.log(`✓ Early Deletion: ${remainingDays} days remaining → $${earlyDeletionCost.toFixed(4)}`, {
        calculation: `${sizeGB} GB × $${tierPricing.earlyDeletionPenalty} × (${remainingDays} / ${tierPricing.minimumStorageDurationDays})`
      });
    } else {
      tracker.log(`✗ No Early Deletion (${remainingDays <= 0 ? 'duration met' : 'no penalty'})`);
    }
  }

  const tierTotal = requestCost + retrievalCost + earlyDeletionCost;
  tracker.log(`Total for ${tier} tier: $${tierTotal.toFixed(4)}`, {
    requests: requestCost,
    retrieval: retrievalCost,
    earlyDeletion: earlyDeletionCost
  });

  return {
    requests: requestCost,
    retrieval: retrievalCost,
    earlyDeletion: earlyDeletionCost,
    total: tierTotal
  };
}

// Main simulation
function simulateCalculationFlow() {
  const tracker = new FlowTracker();
  
  tracker.log('START: User Inputs Received', mockInputs);
  tracker.log(`Processing ${STORAGE_OPTIONS.length} storage options`);
  
  STORAGE_OPTIONS.forEach((option, index) => {
    tracker.log(`\n--- Option ${index + 1}: ${option.name} ---`);
    
    if (option.type === 'aws') {
      tracker.log('AWS S3 Calculation');
      tracker.log('Calculate Storage Costs (tiered pricing)');
      tracker.log('Calculate Incremental Costs');
      
      // Simulate AWS incremental for each tier
      const tiers = ['hot', 'cold', 'archive'];
      let totalIncremental = 0;
      
      tiers.forEach(tier => {
        const sizeGB = mockInputs.tierAllocation[tier];
        // Mock pricing - in real app this comes from pricing.ts
        const mockPricing = {
          putCopyPostListRequests: 0.005,
          getSelectRequests: 0.0004,
          dataRetrieval: tier === 'cold' ? { standard: 0.01 } : { standard: 0.01, expedited: 0.03 },
          dataRetrievalRequests: tier === 'archive' ? { standard: 0.05, expedited: 10.00 } : undefined,
          minimumStorageDurationDays: tier === 'cold' ? 30 : tier === 'archive' ? 90 : undefined,
          earlyDeletionPenalty: tier === 'cold' ? 0.0125 : tier === 'archive' ? 0.0036 : undefined
        };
        
        const tierCosts = simulateAWSIncrementalCosts(tracker, mockInputs.awsTransactions, tier, mockPricing, sizeGB);
        totalIncremental += tierCosts.total;
      });
      
      tracker.log(`Total Incremental Cost: $${totalIncremental.toFixed(4)}`);
      tracker.log(`Multiply by ${mockInputs.numberOfDatabases} databases: $${(totalIncremental * mockInputs.numberOfDatabases).toFixed(4)}`);
      
    } else {
      tracker.log(`Azure ${option.type} ${option.replication} Calculation`);
      tracker.log('Calculate Storage Costs (tiered pricing)');
      
      if (option.type === 'data-lake') {
        tracker.log('Calculate Index Costs (Hot/Cold tiers only)');
      }
      
      tracker.log('Calculate Incremental Costs');
      
      // Simulate Azure incremental for each tier
      const tiers = ['hot', 'cold', 'archive'];
      let totalIncremental = 0;
      
      tiers.forEach(tier => {
        // Mock pricing - in real app this comes from pricing.ts
        const mockPricing = {
          writeOperations: 0.065,
          readOperations: 0.0052,
          iterativeReadOperations: 0.065,
          iterativeWriteOperations: 0.065,
          otherOperations: 0.0052,
          archiveHighPriorityRead: tier === 'archive' ? 79.95 : undefined,
          dataRetrieval: tier === 'cold' ? 0.0369 : tier === 'archive' ? 0.02 : 0,
          archiveHighPriorityRetrieval: tier === 'archive' ? 0.123 : undefined,
          queryAccelerationScanned: (tier === 'hot' || tier === 'cold') ? 0.00226 : undefined,
          queryAccelerationReturned: (tier === 'hot' || tier === 'cold') ? 0.00080 : undefined
        };
        
        const tierCosts = simulateAzureIncrementalCosts(tracker, mockInputs.azureTransactions, tier, mockPricing);
        totalIncremental += tierCosts.total;
      });
      
      tracker.log(`Total Incremental Cost: $${totalIncremental.toFixed(4)}`);
      tracker.log(`Multiply by ${mockInputs.numberOfDatabases} databases: $${(totalIncremental * mockInputs.numberOfDatabases).toFixed(4)}`);
    }
    
    tracker.log(`Final Cost = Base Storage + Incremental`);
  });
  
  tracker.log('\nEND: All calculations complete');
  
  return tracker;
}

// Generate Mermaid flowchart code
function generateMermaidFlowchart() {
  return `flowchart TD
    Start([Start: User Inputs]) --> Inputs[Input Parameters:<br/>- totalSizeGB: ${mockInputs.totalSizeGB} GB<br/>- tierAllocation: Hot ${mockInputs.tierAllocation.hot}GB, Cold ${mockInputs.tierAllocation.cold}GB, Archive ${mockInputs.tierAllocation.archive}GB<br/>- numberOfDatabases: ${mockInputs.numberOfDatabases}<br/>- Transaction Inputs: All Filled<br/>- AWS Transaction Inputs: All Filled]
    
    Inputs --> LoopStart{For Each of 5 Storage Options}
    
    LoopStart --> Option1[Option 1:<br/>Azure Data Lake Storage LRS]
    LoopStart --> Option2[Option 2:<br/>Azure Data Lake Storage GRS]
    LoopStart --> Option3[Option 3:<br/>Azure Blob Storage LRS]
    LoopStart --> Option4[Option 4:<br/>Azure Blob Storage GRS]
    LoopStart --> Option5[Option 5:<br/>AWS S3]
    
    Option1 --> Calc1[Calculate Storage Costs<br/>Using Tiered Pricing Slabs]
    Option2 --> Calc2[Calculate Storage Costs<br/>Using Tiered Pricing Slabs]
    Option3 --> Calc3[Calculate Storage Costs<br/>Using Tiered Pricing Slabs]
    Option4 --> Calc4[Calculate Storage Costs<br/>Using Tiered Pricing Slabs]
    Option5 --> Calc5[Calculate Storage Costs<br/>Using Tiered Pricing Slabs]
    
    Calc1 --> TierLoop1{For Each Tier:<br/>Hot, Cold, Archive}
    Calc2 --> TierLoop2{For Each Tier:<br/>Hot, Cold, Archive}
    Calc3 --> TierLoop3{For Each Tier:<br/>Hot, Cold, Archive}
    Calc4 --> TierLoop4{For Each Tier:<br/>Hot, Cold, Archive}
    Calc5 --> TierLoop5{For Each Tier:<br/>Hot, Cold, Archive}
    
    TierLoop1 --> StorageCalc1[Calculate Storage Cost<br/>Hot: ${mockInputs.tierAllocation.hot}GB<br/>Cold: ${mockInputs.tierAllocation.cold}GB<br/>Archive: ${mockInputs.tierAllocation.archive}GB]
    TierLoop2 --> StorageCalc2[Calculate Storage Cost<br/>Hot: ${mockInputs.tierAllocation.hot}GB<br/>Cold: ${mockInputs.tierAllocation.cold}GB<br/>Archive: ${mockInputs.tierAllocation.archive}GB]
    TierLoop3 --> StorageCalc3[Calculate Storage Cost<br/>Hot: ${mockInputs.tierAllocation.hot}GB<br/>Cold: ${mockInputs.tierAllocation.cold}GB<br/>Archive: ${mockInputs.tierAllocation.archive}GB]
    TierLoop4 --> StorageCalc4[Calculate Storage Cost<br/>Hot: ${mockInputs.tierAllocation.hot}GB<br/>Cold: ${mockInputs.tierAllocation.cold}GB<br/>Archive: ${mockInputs.tierAllocation.archive}GB]
    TierLoop5 --> StorageCalc5[Calculate Storage Cost<br/>Hot: ${mockInputs.tierAllocation.hot}GB<br/>Cold: ${mockInputs.tierAllocation.cold}GB<br/>Archive: ${mockInputs.tierAllocation.archive}GB]
    
    StorageCalc1 --> IndexCheck1{Is Data Lake<br/>& Hot/Cold?}
    StorageCalc2 --> IndexCheck2{Is Data Lake<br/>& Hot/Cold?}
    StorageCalc3 --> IndexCheck3[No Index]
    StorageCalc4 --> IndexCheck4[No Index]
    StorageCalc5 --> IndexCheck5[No Index]
    
    IndexCheck1 -->|Yes| IndexCalc1[Calculate Index Cost<br/>Hot: ${mockInputs.tierAllocation.hot}GB × indexPrice<br/>Cold: ${mockInputs.tierAllocation.cold}GB × indexPrice]
    IndexCheck1 -->|No| NoIndex1[Skip Index]
    IndexCheck2 -->|Yes| IndexCalc2[Calculate Index Cost<br/>Hot: ${mockInputs.tierAllocation.hot}GB × indexPrice<br/>Cold: ${mockInputs.tierAllocation.cold}GB × indexPrice]
    IndexCheck2 -->|No| NoIndex2[Skip Index]
    
    IndexCalc1 --> SumTier1[Sum Tier Costs:<br/>Hot + Cold + Archive + Index]
    NoIndex1 --> SumTier1
    IndexCalc2 --> SumTier2[Sum Tier Costs:<br/>Hot + Cold + Archive + Index]
    NoIndex2 --> SumTier2
    StorageCalc3 --> SumTier3[Sum Tier Costs:<br/>Hot + Cold + Archive]
    StorageCalc4 --> SumTier4[Sum Tier Costs:<br/>Hot + Cold + Archive]
    StorageCalc5 --> SumTier5[Sum Tier Costs:<br/>Hot + Cold + Archive]
    
    SumTier1 --> MultDB1[Multiply by<br/>${mockInputs.numberOfDatabases} databases]
    SumTier2 --> MultDB2[Multiply by<br/>${mockInputs.numberOfDatabases} databases]
    SumTier3 --> MultDB3[Multiply by<br/>${mockInputs.numberOfDatabases} databases]
    SumTier4 --> MultDB4[Multiply by<br/>${mockInputs.numberOfDatabases} databases]
    SumTier5 --> MultDB5[Multiply by<br/>${mockInputs.numberOfDatabases} databases]
    
    MultDB1 --> BaseCost1[Base Storage Cost<br/>per Month]
    MultDB2 --> BaseCost2[Base Storage Cost<br/>per Month]
    MultDB3 --> BaseCost3[Base Storage Cost<br/>per Month]
    MultDB4 --> BaseCost4[Base Storage Cost<br/>per Month]
    MultDB5 --> BaseCost5[Base Storage Cost<br/>per Month]
    
    BaseCost1 --> IncCalc1[Calculate Incremental Costs<br/>Azure: All Parameters Checked]
    BaseCost2 --> IncCalc2[Calculate Incremental Costs<br/>Azure: All Parameters Checked]
    BaseCost3 --> IncCalc3[Calculate Incremental Costs<br/>Azure: All Parameters Checked]
    BaseCost4 --> IncCalc4[Calculate Incremental Costs<br/>Azure: All Parameters Checked]
    BaseCost5 --> IncCalc5[Calculate AWS Incremental Costs<br/>AWS: All Parameters Checked]
    
    IncCalc1 --> Final1[Final Cost =<br/>Base + Incremental]
    IncCalc2 --> Final2[Final Cost =<br/>Base + Incremental]
    IncCalc3 --> Final3[Final Cost =<br/>Base + Incremental]
    IncCalc4 --> Final4[Final Cost =<br/>Base + Incremental]
    IncCalc5 --> Final5[Final Cost =<br/>Base + Incremental]
    
    Final1 --> Results[Display Results:<br/>5 Storage Options<br/>with Monthly Costs]
    Final2 --> Results
    Final3 --> Results
    Final4 --> Results
    Final5 --> Results
    
    Results --> End([End])
    
    style Start fill:#e1f5ff
    style End fill:#e1f5ff
    style Results fill:#c8e6c9
    style IncCalc1 fill:#fff9c4
    style IncCalc2 fill:#fff9c4
    style IncCalc3 fill:#fff9c4
    style IncCalc4 fill:#fff9c4
    style IncCalc5 fill:#fff9c4`;
}

// Read detailed flowchart from markdown file
function getDetailedFlowchartFromMarkdown() {
  const markdownPath = path.join(__dirname, '../calculation-flowchart.md');
  if (!fs.existsSync(markdownPath)) {
    console.warn('⚠️  calculation-flowchart.md not found, using simplified version');
    return generateMermaidFlowchart();
  }

  const markdownContent = fs.readFileSync(markdownPath, 'utf8');
  
  // Extract the first mermaid code block (Overview Flowchart)
  const mermaidMatch = markdownContent.match(/```mermaid\n([\s\S]*?)\n```/);
  
  if (mermaidMatch && mermaidMatch[1]) {
    let mermaidCode = mermaidMatch[1].trim();
    
    // Replace placeholder values with actual mock input values
    mermaidCode = mermaidCode.replace(/totalSizeGB/g, `${mockInputs.totalSizeGB} GB`);
    mermaidCode = mermaidCode.replace(/numberOfDatabases/g, `${mockInputs.numberOfDatabases}`);
    
    // Replace tier allocation placeholders
    const hotGB = mockInputs.tierAllocation.hot;
    const coldGB = mockInputs.tierAllocation.cold;
    const archiveGB = mockInputs.tierAllocation.archive;
    mermaidCode = mermaidCode.replace(/tierAllocation: hot, cold, archive/g, 
      `tierAllocation: Hot ${hotGB}GB, Cold ${coldGB}GB, Archive ${archiveGB}GB`);
    
    return mermaidCode;
  } else {
    console.warn('⚠️  No mermaid code block found in calculation-flowchart.md, using simplified version');
    return generateMermaidFlowchart();
  }
}

// Save flowchart and convert to image
function saveFlowchartAsImage() {
  const outputDir = path.join(__dirname, '../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Use detailed flowchart from markdown file
  const mermaidCode = getDetailedFlowchartFromMarkdown();
  const mmdPath = path.join(outputDir, 'calculation-flowchart.mmd');
  const pngPath = path.join(outputDir, 'calculation-flowchart.png');
  const svgPath = path.join(outputDir, 'calculation-flowchart.svg');

  // Save Mermaid code
  fs.writeFileSync(mmdPath, mermaidCode, 'utf8');
  console.log(`\n✓ Mermaid code saved to: ${mmdPath}`);

  // Convert to PNG using mermaid-cli
  try {
    console.log('\n🖼️  Converting to PNG image...');
    execSync(`npx @mermaid-js/mermaid-cli -i "${mmdPath}" -o "${pngPath}" -w 2400 -H 1800`, {
      stdio: 'inherit'
    });
    console.log(`✓ PNG image saved to: ${pngPath}`);
  } catch (error) {
    console.error('⚠️  Error converting to PNG:', error.message);
    console.log('💡 You can manually convert the .mmd file using: npx @mermaid-js/mermaid-cli -i output/calculation-flowchart.mmd -o output/calculation-flowchart.png');
  }

  // Convert to SVG
  try {
    console.log('\n🖼️  Converting to SVG image...');
    execSync(`npx @mermaid-js/mermaid-cli -i "${mmdPath}" -o "${svgPath}"`, {
      stdio: 'inherit'
    });
    console.log(`✓ SVG image saved to: ${svgPath}`);
  } catch (error) {
    console.error('⚠️  Error converting to SVG:', error.message);
  }

  return { mmdPath, pngPath, svgPath };
}

// Run the simulation
console.log('🚀 Starting Calculation Flow Simulation...\n');
const tracker = simulateCalculationFlow();
tracker.printFlow();
tracker.printSummary();

// Generate and save flowchart
console.log('\n📊 Generating Flowchart...\n');
const files = saveFlowchartAsImage();
console.log('\n✅ Flowchart generation complete!');
console.log(`\n📁 Files saved in: ${path.join(__dirname, '../output')}`);
console.log(`   - Mermaid source: ${files.mmdPath}`);
console.log(`   - PNG image: ${files.pngPath}`);
console.log(`   - SVG image: ${files.svgPath}`);

// Export for use in other scripts
module.exports = { simulateCalculationFlow, FlowTracker, generateMermaidFlowchart, saveFlowchartAsImage };
