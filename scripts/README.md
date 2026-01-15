# Flowchart Visualizer Script

## How to Run

### Option 1: Using npm script (Recommended)
```bash
npm run flowchart
```

### Option 2: Direct node command
```bash
node scripts/flowchart-visualizer.js
```

### Option 3: From project root
```bash
cd storage-cost-iterations
npm run flowchart
```

## What It Does

The script simulates the complete calculation flow for all 5 storage options:
1. Azure Data Lake Storage (LRS)
2. Azure Data Lake Storage (GRS)
3. Azure Blob Storage (LRS)
4. Azure Blob Storage (GRS)
5. AWS S3

It shows:
- Every parameter check
- Step-by-step calculations
- Formulas used
- Final costs per option

## Output

The script outputs:
- **Calculation Flow**: Step-by-step process for each option (console)
- **Flow Summary**: Total steps and complete path (console)
- **Flowchart Images**: Automatically generated and saved to `output/` folder:
  - `calculation-flowchart.mmd` - Mermaid source code
  - `calculation-flowchart.png` - PNG image (2400x1800px)
  - `calculation-flowchart.svg` - SVG image (scalable vector)

## Output Location

All generated files are saved in:
```
storage-cost-iterations/output/
```

## Modifying Test Data

Edit the `mockInputs` object in `scripts/flowchart-visualizer.js` to test with different values. The flowchart will automatically update with your new values when you run the script again.
