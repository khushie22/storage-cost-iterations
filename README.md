# Azure Storage Cost Calculator

A production-ready Next.js web application for calculating Azure storage costs based on detailed user inputs. This calculator supports Azure Data Lake Storage and Azure Blob Storage with accurate pricing logic based on Azure's public pricing.

## Features

- **Multiple Storage Types**: Support for Azure Data Lake Storage and Azure Blob Storage
- **Replication Options**: LRS (Locally Redundant Storage) and GRS (Geo-Redundant Storage)
- **Storage Tiers**: Hot, Cold, and Archive tiers with accurate pricing
- **Multiple Databases**: Configure up to 75 databases, each with a maximum capacity of 500 TB
- **Flexible Tier Allocation**: 
  - Percentage-based allocation
  - Absolute capacity input (TB)
- **Comprehensive Cost Calculation**:
  - Storage costs with volume pricing slabs
  - Transaction costs (read/write operations)
  - Retrieval costs (Cold and Archive tiers)
  - Query acceleration costs
  - Index costs (Data Lake Storage)
- **Detailed Results**:
  - Total monthly/annual costs
  - Cost breakdown by tier
  - Per-database cost breakdown with expandable details
  - Currency formatting (USD)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page component
│   └── globals.css         # Global styles
├── components/
│   ├── DatabaseConfig.tsx      # Storage type and replication selection
│   ├── TierAllocation.tsx      # Tier allocation interface
│   ├── TransactionInputs.tsx   # Transaction and usage inputs
│   └── CostResults.tsx         # Results display component
├── lib/
│   ├── pricing.ts              # Pricing configuration
│   └── costCalculator.ts      # Cost calculation logic
├── types/
│   └── index.ts               # TypeScript type definitions
└── package.json
```

## Cost Calculation Logic

The application implements accurate Azure pricing logic:

1. **Storage Costs**: Applies tiered pricing slabs correctly (e.g., first 51,200 GB at one rate, next 460,800 GB at another rate, etc.)

2. **Transaction Costs**: Calculates costs based on:
   - Write operations (per 10,000)
   - Read operations (per 10,000)
   - Iterative read/write operations
   - Other operations
   - Archive high-priority operations

3. **Retrieval Costs**: 
   - Cold tier: $0.0369 per GB
   - Archive tier: $0.02 per GB (standard) or $0.123 per GB (high priority)

4. **Query Acceleration**: Costs for data scanned and returned (Hot and Cold tiers only)

5. **Index Costs**: Metadata storage costs for Data Lake Storage (Hot and Cold tiers only)

## Pricing Data

The pricing configuration is based on Azure's public pricing as of the implementation date. All prices are in USD and can be updated in `lib/pricing.ts`.

### Supported Configurations

- **Azure Data Lake Storage - LRS**: Hot, Cold, Archive tiers
- **Azure Data Lake Storage - GRS**: Hot, Cold, Archive tiers
- **Azure Blob Storage - LRS**: Hot, Cold, Archive tiers
- **Azure Blob Storage - GRS**: Hot, Cold, Archive tiers

## Extending Pricing

To add new pricing or update existing prices:

1. Open `lib/pricing.ts`
2. Update the `PRICING_CONFIG` object with new pricing data
3. The cost calculator will automatically use the updated pricing

## Assumptions Made

1. **Volume Pricing**: Storage costs are calculated using tiered pricing slabs. The calculator correctly applies different rates based on volume ranges.

2. **Transaction Units**: 
   - Write/Read operations are priced per 10,000 operations
   - Iterative write operations are priced per 100 operations
   - All other operations are priced per 10,000 operations

3. **Data Retrieval**: 
   - Hot tier: Free
   - Cold tier: Standard retrieval only
   - Archive tier: Supports both standard and high-priority retrieval

4. **Query Acceleration**: Only available for Hot and Cold tiers (not Archive)

5. **Index Costs**: Only applicable to Data Lake Storage Hot and Cold tiers

6. **Reserved Capacity**: Pricing is available but not automatically applied in the calculator. This can be added as a future enhancement.

## Technical Details

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React hooks (useState, useMemo)
- **Architecture**: Modular design with separated concerns:
  - Pricing configuration
  - Cost calculation logic
  - UI components
  - Type definitions

## Future Enhancements

- Reserved capacity pricing toggle
- Export results to CSV/PDF
- Save/load configurations
- Historical cost tracking
- Cost optimization suggestions
- Support for additional Azure storage types

## License

This project is provided as-is for cost estimation purposes.



