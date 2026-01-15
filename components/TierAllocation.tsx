'use client';

import React, { useState } from 'react';
import { TierAllocation } from '@/lib/costCalculator';

interface TierAllocationProps {
  databaseId: string;
  databaseName: string;
  totalSizeTB: number;
  allocation: TierAllocation;
  onAllocationChange: (allocation: TierAllocation) => void;
  onSizeChange: (sizeTB: number) => void;
}

type AllocationMode = 'percentage' | 'absolute';

export default function TierAllocationComponent({
  databaseId,
  databaseName,
  totalSizeTB,
  allocation,
  onAllocationChange,
  onSizeChange,
}: TierAllocationProps) {
  const [mode, setMode] = useState<AllocationMode>('percentage');
  const maxSizeTB = 500;

  const totalAllocated = allocation.hot + allocation.cold + allocation.archive;
  const percentages = {
    hot: totalSizeTB > 0 ? (allocation.hot / totalSizeTB) * 100 : 0,
    cold: totalSizeTB > 0 ? (allocation.cold / totalSizeTB) * 100 : 0,
    archive: totalSizeTB > 0 ? (allocation.archive / totalSizeTB) * 100 : 0,
  };
  const totalPercentage = percentages.hot + percentages.cold + percentages.archive;

  const isValid = totalAllocated <= totalSizeTB && totalSizeTB <= maxSizeTB;

  const handlePercentageChange = (tier: keyof TierAllocation, percentage: number) => {
    const newPercentage = Math.max(0, Math.min(100, percentage));
    const newAllocation = { ...allocation };
    
    if (mode === 'percentage') {
      // Calculate new percentages
      const currentPercentages = { ...percentages };
      const diff = newPercentage - currentPercentages[tier];
      const currentTotal = currentPercentages.hot + currentPercentages.cold + currentPercentages.archive;
      
      // If adding this percentage would exceed 100%, adjust other tiers
      if (currentTotal + diff > 100) {
        const excess = currentTotal + diff - 100;
        const otherTiers: (keyof TierAllocation)[] = ['hot', 'cold', 'archive'].filter(
          t => t !== tier
        ) as (keyof TierAllocation)[];
        const otherTotal = otherTiers.reduce((sum, t) => sum + currentPercentages[t], 0);
        
        // Distribute the excess reduction across other tiers proportionally
        otherTiers.forEach(t => {
          if (otherTotal > 0) {
            currentPercentages[t] = Math.max(0, currentPercentages[t] - (excess * currentPercentages[t] / otherTotal));
          }
        });
      }
      
      currentPercentages[tier] = newPercentage;
      
      // Convert percentages to TB
      newAllocation.hot = (currentPercentages.hot / 100) * totalSizeTB;
      newAllocation.cold = (currentPercentages.cold / 100) * totalSizeTB;
      newAllocation.archive = (currentPercentages.archive / 100) * totalSizeTB;
    } else {
      newAllocation[tier] = (newPercentage / 100) * totalSizeTB;
    }
    
    onAllocationChange(newAllocation);
  };

  const handleAbsoluteChange = (tier: keyof TierAllocation, valueTB: number) => {
    const newValue = Math.max(0, Math.min(totalSizeTB, valueTB));
    const newAllocation = { ...allocation };
    newAllocation[tier] = newValue;
    onAllocationChange(newAllocation);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{databaseName}</h3>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Total Size (TB):
          </label>
          <input
            type="number"
            min="0"
            max={maxSizeTB}
            step="0.1"
            value={totalSizeTB}
            onChange={(e) => {
              const newSize = parseFloat(e.target.value) || 0;
              if (newSize <= maxSizeTB) {
                onSizeChange(newSize);
                // Scale allocations proportionally
                if (totalSizeTB > 0) {
                  const scale = newSize / totalSizeTB;
                  onAllocationChange({
                    hot: allocation.hot * scale,
                    cold: allocation.cold * scale,
                    archive: allocation.archive * scale,
                  });
                }
              }
            }}
            className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <span className="text-sm text-gray-500">Max: {maxSizeTB} TB</span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={mode === 'percentage'}
              onChange={() => setMode('percentage')}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Percentage</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={mode === 'absolute'}
              onChange={() => setMode('absolute')}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Absolute (TB)</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['hot', 'cold', 'archive'] as const).map((tier) => (
          <div key={tier} className="border border-gray-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
              {tier} Tier
            </label>
            
            {mode === 'percentage' ? (
              <div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={percentages[tier]}
                  onChange={(e) => handlePercentageChange(tier, parseFloat(e.target.value))}
                  className="w-full mb-2"
                />
                <div className="flex justify-between items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={percentages[tier].toFixed(1)}
                    onChange={(e) => handlePercentageChange(tier, parseFloat(e.target.value))}
                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm text-gray-600">
                    {allocation[tier].toFixed(2)} TB
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  min="0"
                  max={totalSizeTB}
                  step="0.1"
                  value={allocation[tier]}
                  onChange={(e) => handleAbsoluteChange(tier, parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-xs text-gray-500 mt-1 block">
                  {totalSizeTB > 0 ? ((allocation[tier] / totalSizeTB) * 100).toFixed(1) : 0}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">
            Total Allocated: {totalAllocated.toFixed(2)} TB
          </span>
          {mode === 'percentage' && (
            <span className={`text-sm font-medium ${
              Math.abs(totalPercentage - 100) < 0.1 ? 'text-green-600' : 'text-red-600'
            }`}>
              Total Percentage: {totalPercentage.toFixed(1)}%
            </span>
          )}
          {!isValid && (
            <span className="text-sm text-red-600">
              {totalAllocated > totalSizeTB 
                ? 'Allocation exceeds database size' 
                : `Database size exceeds maximum of ${maxSizeTB} TB`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

