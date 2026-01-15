(Website + Costing Logic)

You are a senior full-stack engineer and cloud cost-modeling expert.

I want you to design and implement a production-ready web application that calculates Azure storage costs based on detailed user inputs. The focus is correct cost logic, scalability, and clean UX, not just a basic calculator.

1. Objective

Build an interactive website that allows users to estimate Azure storage costs using a two-step process:

Step 1: Calculate and compare storage costs across all Azure storage options simultaneously (comparison view).

Step 2: Calculate incremental costs (transactions, retrieval, etc.) on top of a locked storage baseline.

The application assumes all databases are identical and multiplies costs by database count. Storage costs are calculated first and locked before proceeding to incremental cost calculations.

The pricing data is fixed and known, based on Azure's public pricing (data to be used already provided in the end).

2. Core Functional Requirements

A. Two-Step Cost Calculation Flow

The application uses a two-step process that separates storage costs from incremental costs:

Step 1: Storage Cost Calculation (Locked Baseline)

Step 2: Incremental Cost Calculation (Transactions, Retrieval, etc.)

B. Step 1: Storage Configuration and Comparison

1. Global Database Assumptions

User enters number of databases (1–75).

All databases are assumed to be identical (same size and tier allocation).

Each database has a maximum capacity of 500 TB.

User enters total storage size per database (TB).

2. Storage Tier Allocation

For the single database template, allow allocation across tiers:

Hot

Cold

Archive

Allocation methods:

Percentage-based input with sliders or numeric input (must sum to 100%)

Absolute capacity input (TB values)

Validation rules:

Total allocation must not exceed database size

UI should show real-time validation feedback

3. Storage Cost Calculation

Calculate storage costs ONLY (no transactions or retrieval costs).

Show costs for ALL storage options simultaneously:

Azure Data Lake Storage (LRS)

Azure Data Lake Storage (GRS)

Azure Blob Storage (LRS)

Azure Blob Storage (GRS)

Display comparison in tabular format showing:

Storage cost by tier (Hot, Cold, Archive)

Index costs (where applicable)

Total storage cost per option

Costs multiplied by number of databases

4. Storage Option Filters

Convert storage type and replication selection into filter controls.

Filters control visibility only (show/hide storage options in comparison view).

All options are calculated regardless of filter state.

5. Cost Locking

After calculating storage costs:

Lock all storage inputs (size, tier allocation, number of databases)

Prevent further changes to storage configuration

Display locked state clearly in UI

User must reset to modify storage configuration

C. Step 2: Incremental Cost Calculation

1. Storage Option Selection

User selects one storage option from Step 1 comparison (or uses default).

Selected option becomes the baseline for incremental calculations.

2. Transaction and Usage Inputs

Allow user to input:

Monthly read volume (GB)

Monthly write volume (GB)

Number of operations (reads/writes per 10,000)

Query acceleration data scanned/returned

Archive high priority read/retrieval

Iterative read/write operations

Other operations

3. Incremental Cost Calculation

Calculate ONLY incremental costs on top of locked storage baseline:

Transaction costs (read/write operations)

Retrieval costs (Cold and Archive tiers)

Query acceleration costs

Apply correct pricing per tier

Multiply by number of databases

4. Results Display

Display incremental costs separately from storage costs:

Transaction costs

Retrieval costs

Query acceleration costs

Total incremental cost

Show selected storage option context

D. Cost Calculation Logic (Critical)

Use real Azure pricing logic, not simplified assumptions.

Storage Costs (Step 1):

Apply tier-specific per-GB pricing

Convert TB → GB correctly

Respect volume pricing slabs where applicable

Support both LRS and GRS pricing differences

Include index costs for Data Lake Storage (Hot/Cold tiers)

Incremental Costs (Step 2):

Per-tier read/write operation pricing

Archive retrieval pricing (normal vs high priority)

Cold tier retrieval costs

Query acceleration costs

Zero-cost operations where applicable

E. Display Options

Monthly vs Annual cost toggle (applies to both steps)

Currency: USD

Clean, professional SaaS-style UI

3. UX Requirements

Step 1 Flow:

"Calculate Storage Costs" button triggers storage-only calculation

Storage comparison view appears showing all options

Storage inputs become locked (disabled) after calculation

Filter controls allow showing/hiding storage options

"Proceed to Step 2" button allows selecting a storage option and moving forward

Step 2 Flow:

Transaction and usage inputs are editable

"Calculate Incremental Costs" button triggers incremental cost calculation

Results display incremental costs separately from storage baseline

"Back to Step 1" button returns to storage comparison (storage remains locked)

"Reset" or "Start Over" button unlocks storage and returns to Step 1

General:

Results appear in tabular format for comparison

Currency: USD

Clean, professional SaaS-style UI

Storage inputs locked after Step 1; transaction inputs always editable

4. Technical Requirements

Frontend: Next.js with React (App Router)

State management must support the two-step flow with cost locking

Cost calculation logic must be separated from UI

Storage costs and incremental costs calculated separately (never merged)

Pricing constants should be stored in a structured config object

Code must be readable, modular, and extensible

Do not simplify pricing logic

Do not merge storage and transaction costs

5. Output Expectations

Provide:

Full frontend code

Cost calculation logic (clearly commented)

Sample pricing configuration object (based on Azure Data Lake Storage LRS example)

Explanation of assumptions made

Clear instructions on how to extend pricing to other Azure storage types

Do not oversimplify Azure pricing.
Do not hardcode values into UI components.
Do not ignore transaction or retrieval costs.

Build this as if it will be used by enterprises making real cost decisions.


Pricing Data below:

Azure Data Lake Storage			
			
Azure Data Lake Storage -- LRS	Hot	Cold	Archive
Data Storage	First 51,200 GB/month - $0.019 per GB	Unlimited - $0.00443 per GB	Unlimited - $0.002 per GB
	Next 460,800 GB - $0.018 per GB		
	Over 512,000 GB - $0.017 per GB		
Storage Capacity Reservations			
100 TB/month	$1,545		$91
1 PB/month	$15,050		$883
Transactions			
Write Operations* (every 4 MB, per 10,000)	$0.065	$0.288	$0.13
Read Operations** (every 4 MB, per 10,000)	$0.0052	$0.16	$6.50
Query Acceleration - Data Scanned (per GB)	$0.00226	$0.00246	N/A
Query Acceleration - Data Returned (per GB)	$0.00080	$0.0123	N/A
*The following API calls are considered write operations: AppendFile, CreateFilesystem, CreatePath, CreatePathFile, FlushFile, SetFileProperties, SetFilesystemProperties, RenameFile, RenamePathFile, CopyFile.			
**The following API calls are considered read operations: ReadFile, ListFilesystemFile.			
Other Operations and Meta data Storage meters			
Iterative Read Operations (per 10,000)*	$0.065	N/A	N/A
Archive High Priority Read (per 10,000)			$79.95
Iterative Write Operations (100’s)**	$0.065	$0.065	$0.065
All other Operations (per 10,000), except Delete (free)	$0.0052	N/A	N/A
Data Retrieval (per GB)	Free	$0.0369	$0.02
Archive High Priority Retrieval (per GB)			$0.123
Data Write (per GB)	Free	Free	Free
Index (GB/Month)	$0.0263	$0.0263	N/A
*The following API calls are considered iterative read operations: List Filesystem & List Path.			
**The following API calls are considered iterative write operations: RenameDirectory, RenamePath, RenamePathDir.			
			
Azure Data Lake Storage -- GRS	Hot	Cold	Archive
Data Storage	First 51,200 GB/month - $0.037 per GB	Unlimited - $0.00803 per GB	Unlimited - $0.004 per GB
	Next 460,800 GB - $0.036 per GB		
	Over 512,000 GB - $0.034 per GB		
Storage Capacity Reservations			
100 TB/month	$3,090		$273
1 PB/month	$30,099		$2,665
Transactions			
Write Operations* (every 4 MB, per 10,000)	$0.13	$0.522	$0.26
Read Operations** (every 4 MB, per 10,000)	$0.0052	$0.16	$6.50
Query Acceleration - Data Scanned (per GB)	$0.00226	$0.00246	N/A
Query Acceleration - Data Returned (per GB)	$0.00080	$0.0123	N/A
*The following API calls are considered write operations: AppendFile, CreateFilesystem, CreatePath, CreatePathFile, FlushFile, SetFileProperties, SetFilesystemProperties, RenameFile, RenamePathFile, CopyFile.			
**The following API calls are considered read operations: ReadFile, ListFilesystemFile.			
Other Operations and Meta data Storage meters			
Iterative Read Operations (per 10,000)*	$0.13	N/A	N/A
Archive High Priority Read (per 10,000)			$79.95
Iterative Write Operations (100’s)**	$0.13	$0.13	$0.13
All other Operations (per 10,000), except Delete (free)	$0.0052	N/A	N/A
Data Retrieval (per GB)	Free	$0.0369	$0.02
Archive High Priority Retrieval (per GB)			$0.123
Data Write (per GB)	Free	Free	Free
Index (GB/Month)	$0.0526	$0.0526	N/A
*The following API calls are considered iterative read operations: List Filesystem & List Path.			
**The following API calls are considered iterative write operations: RenameDirectory, RenamePath, RenamePathDir.			


Azure Blob Storage			
			
Azure Blob Storage -- LRS	Hot	Cold	Archive
Data Storage (per GB prices)			
First 50 TB/month	$0.018 	$0.00443 	$0.002 
Next 450 TB/month	$0.0173 	$0.00443 	$0.002 
Over 500 TB/month	$0.0166 	$0.00443 	$0.002 
Storage Reserved Capacity			
100 TB/month	$1,545		$91
1 PB/month	$15,050		$883
Operations and Data Transfer			
Write operations (per 10,000)	$0.065	$0.288	$0.13
Read operations (per 10,000)	$0.005	$0.16	$6.50
Archive High Priority Read (per 10,000)			$79.95
Iterative Read Operations (per 10,000)	$0.0052	$0.0052	$0.0052
Iterative Write Operations (100’s)	$0.065	$0.065	$0.065
Data Retrieval (per GB)	Free	$0.0369	$0.02
Archive High Priority Retrieval (per GB)			$0.123
Data Write (per GB)	Free	Free	Free
Index (GB/month)	N/A	N/A	N/A
All other Operations (per 10,000), except Delete (free)	$0.005	$0.005	$0.005
			
			
			
			
			
			
			
Azure Blob Storage -- GRS	Hot	Cold	Archive
Data Storage (per GB prices)			
First 50 TB/month	$0.037	$0.00803 	$0.004
Next 450 TB/month	$0.0353 	$0.00803 	$0.004
Over 500 TB/month	$0.0339	$0.00803 	$0.004
Storage Reserved Capacity			
100 TB/month	$3,090		$273
1 PB/month	$30,099		$2,665
Operations and Data Transfer			
Write operations (per 10,000)	$0.13	$0.522	$0.26
Read operations (per 10,000)	$0.005	$0.16	$6.50
Archive High Priority Read (per 10,000)			$79.95
Iterative Read Operations (per 10,000)	$0.0052	$0.0052	$0.0052
Iterative Write Operations (100’s)	$0.13	$0.13	$0.13
Data Retrieval (per GB)	Free	$0.0369	$0.02
Archive High Priority Retrieval (per GB)			$0.123
Data Write (per GB)	Free	Free	Free
Index (GB/month)	N/A	N/A	N/A
All other Operations (per 10,000), except Delete (free)	$0.005	$0.005	$0.005
