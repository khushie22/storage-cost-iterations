'use client';

import React from 'react';
import { TierAllocation } from '@/lib/costCalculator';

interface StorageInputsProps {
  totalSizeTB: number;
  tierAllocation: TierAllocation;
  numberOfDatabases: number;
  isLocked: boolean;
  onSizeChange: (sizeTB: number) => void;
  onAllocationChange: (allocation: TierAllocation) => void;
  onNumberOfDatabasesChange: (count: number) => void;
}

type AllocationMode = 'percentage' | 'absolute';

export default function StorageInputs({
  totalSizeTB,
  tierAllocation,
  numberOfDatabases,
  isLocked,
  onSizeChange,
  onAllocationChange,
  onNumberOfDatabasesChange,
}: StorageInputsProps) {
  const [mode, setMode] = React.useState<AllocationMode>('percentage');
  const maxSizeTB = 500;

  const totalAllocated = tierAllocation.hot + tierAllocation.cold + tierAllocation.archive;
  const percentages = {
    hot: totalSizeTB > 0 ? (tierAllocation.hot / totalSizeTB) * 100 : 0,
    cold: totalSizeTB > 0 ? (tierAllocation.cold / totalSizeTB) * 100 : 0,
    archive: totalSizeTB > 0 ? (tierAllocation.archive / totalSizeTB) * 100 : 0,
  };
  const totalPercentage = percentages.hot + percentages.cold + percentages.archive;

  const isValid = totalAllocated <= totalSizeTB && totalSizeTB <= maxSizeTB;

  const handlePercentageChange = (tier: keyof TierAllocation, percentage: number) => {
    if (isLocked) return;
    
    const newPercentage = Math.max(0, Math.min(100, percentage));
    const newAllocation = { ...tierAllocation };
    
    const currentPercentages = { ...percentages };
    const diff = newPercentage - currentPercentages[tier];
    const currentTotal = currentPercentages.hot + currentPercentages.cold + currentPercentages.archive;
    
    if (currentTotal + diff > 100) {
      const excess = currentTotal + diff - 100;
      const otherTiers: (keyof TierAllocation)[] = ['hot', 'cold', 'archive'].filter(
        t => t !== tier
      ) as (keyof TierAllocation)[];
      const otherTotal = otherTiers.reduce((sum, t) => sum + currentPercentages[t], 0);
      
      otherTiers.forEach(t => {
        if (otherTotal > 0) {
          currentPercentages[t] = Math.max(0, currentPercentages[t] - (excess * currentPercentages[t] / otherTotal));
        }
      });
    }
    
    currentPercentages[tier] = newPercentage;
    newAllocation.hot = (currentPercentages.hot / 100) * totalSizeTB;
    newAllocation.cold = (currentPercentages.cold / 100) * totalSizeTB;
    newAllocation.archive = (currentPercentages.archive / 100) * totalSizeTB;
    
    onAllocationChange(newAllocation);
  };

  const handleAbsoluteChange = (tier: keyof TierAllocation, valueTB: number) => {
    if (isLocked) return;
    
    const newValue = Math.max(0, Math.min(totalSizeTB, valueTB));
    const newAllocation = { ...tierAllocation };
    newAllocation[tier] = newValue;
    onAllocationChange(newAllocation);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Step 1: Storage Configuration</h2>
        {isLocked && (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Locked
          </span>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Databases (1-75)
        </label>
        <input
          type="number"
          min="1"
          max="75"
          value={numberOfDatabases}
          onChange={(e) => {
            if (!isLocked) {
              const value = parseInt(e.target.value) || 1;
              onNumberOfDatabasesChange(Math.max(1, Math.min(75, value)));
            }
          }}
          disabled={isLocked}
          className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            isLocked ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
        <p className="text-xs text-gray-500 mt-1">
          All databases are assumed to have identical storage configuration
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Total Storage Size per Database (TB)
        </label>
        <input
          type="number"
          min="0"
          max={maxSizeTB}
          step="0.1"
          value={totalSizeTB}
          onChange={(e) => {
            if (!isLocked) {
              const newSize = parseFloat(e.target.value) || 0;
              if (newSize <= maxSizeTB) {
                onSizeChange(newSize);
                const scale = totalSizeTB > 0 ? newSize / totalSizeTB : 1;
                onAllocationChange({
                  hot: tierAllocation.hot * scale,
                  cold: tierAllocation.cold * scale,
                  archive: tierAllocation.archive * scale,
                });
              }
            }
          }}
          disabled={isLocked}
          className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            isLocked ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
        <span className="text-sm text-gray-500">Max: {maxSizeTB} TB per database</span>
      </div>

      <div className="mb-4">
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              checked={mode === 'percentage'}
              onChange={() => !isLocked && setMode('percentage')}
              disabled={isLocked}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-700">Percentage</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              checked={mode === 'absolute'}
              onChange={() => !isLocked && setMode('absolute')}
              disabled={isLocked}
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
                  disabled={isLocked}
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
                    disabled={isLocked}
                    className={`w-24 px-2 py-1 border border-gray-300 rounded text-sm ${
                      isLocked ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                  <span className="text-sm text-gray-600">
                    {tierAllocation[tier].toFixed(2)} TB
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
                  value={tierAllocation[tier]}
                  onChange={(e) => handleAbsoluteChange(tier, parseFloat(e.target.value))}
                  disabled={isLocked}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    isLocked ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
                <span className="text-xs text-gray-500 mt-1 block">
                  {totalSizeTB > 0 ? ((tierAllocation[tier] / totalSizeTB) * 100).toFixed(1) : 0}%
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
          {!isValid && !isLocked && (
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

