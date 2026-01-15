'use client';

import React from 'react';
import { TierAllocation } from '@/lib/costCalculator';

interface StorageConfigurationProps {
  totalSizeGB: number;
  tierAllocation: TierAllocation;
  numberOfDatabases: number;
  onSizeChange: (sizeGB: number) => void;
  onAllocationChange: (allocation: TierAllocation) => void;
  onNumberOfDatabasesChange: (count: number) => void;
}

export default function StorageConfiguration({
  totalSizeGB,
  tierAllocation,
  numberOfDatabases,
  onSizeChange,
  onAllocationChange,
  onNumberOfDatabasesChange,
}: StorageConfigurationProps) {
  const maxSizeGB = 500 * 1024; // 500 TB in GB

  const totalAllocated = tierAllocation.hot + tierAllocation.cold + tierAllocation.archive;
  const percentages = {
    hot: totalSizeGB > 0 ? (tierAllocation.hot / totalSizeGB) * 100 : 0,
    cold: totalSizeGB > 0 ? (tierAllocation.cold / totalSizeGB) * 100 : 0,
    archive: totalSizeGB > 0 ? (tierAllocation.archive / totalSizeGB) * 100 : 0,
  };
  const totalPercentage = percentages.hot + percentages.cold + percentages.archive;

  const isValid = totalAllocated <= totalSizeGB && totalSizeGB <= maxSizeGB;

  const handlePercentageChange = (tier: keyof TierAllocation, percentage: number) => {
    const newPercentage = Math.max(0, Math.min(100, percentage));
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
    const newAllocation: TierAllocation = {
      hot: (currentPercentages.hot / 100) * totalSizeGB,
      cold: (currentPercentages.cold / 100) * totalSizeGB,
      archive: (currentPercentages.archive / 100) * totalSizeGB,
    };
    
    onAllocationChange(newAllocation);
  };

  const handleAbsoluteChange = (tier: keyof TierAllocation, valueGB: number) => {
    const newValue = Math.max(0, Math.min(totalSizeGB, valueGB));
    const newAllocation = { ...tierAllocation };
    newAllocation[tier] = newValue;
    onAllocationChange(newAllocation);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/60 p-5 h-full backdrop-blur-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-5 tracking-tight">Storage Configuration</h2>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-700 mb-2 tracking-wide">
          Number of Databases (1-75)
        </label>
        <input
          type="number"
          min="0"
          max="75"
          value={numberOfDatabases}
          onChange={(e) => {
            const value = parseInt(e.target.value) || 0;
            onNumberOfDatabasesChange(Math.max(0, Math.min(75, value)));
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
        />
        <p className="text-[10px] text-slate-500 mt-1 font-medium">
          All databases have identical configuration
        </p>
      </div>

      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-700 mb-2 tracking-wide">
          Total Storage Size per Database (GB)
        </label>
        <input
          type="number"
          min="0"
          max={maxSizeGB}
          step="1"
          value={totalSizeGB}
          onChange={(e) => {
            const newSize = parseFloat(e.target.value) || 0;
            if (newSize <= maxSizeGB) {
              onSizeChange(newSize);
              const scale = totalSizeGB > 0 ? newSize / totalSizeGB : 1;
              onAllocationChange({
                hot: tierAllocation.hot * scale,
                cold: tierAllocation.cold * scale,
                archive: tierAllocation.archive * scale,
              });
            }
          }}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-slate-50/50 text-slate-900 text-sm font-medium"
        />
        <span className="text-[10px] text-slate-500 font-medium mt-1 block">Max: {maxSizeGB.toLocaleString('en-US')} GB ({(maxSizeGB / 1024).toLocaleString('en-US')} TB)</span>
      </div>

      <div className="mb-4">
        <h3 className="text-xs font-bold text-slate-800 mb-3 tracking-wide uppercase">Tier Allocation</h3>
        {(['hot', 'cold', 'archive'] as const).map((tier) => (
          <div key={tier} className="mb-3 border border-slate-200 rounded-lg p-3 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 capitalize tracking-wide">
                {tier}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={percentages[tier].toFixed(1)}
                  onChange={(e) => handlePercentageChange(tier, parseFloat(e.target.value))}
                  className="tier-allocation-input w-14 px-1.5 py-1 border border-slate-300 rounded text-xs text-right font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 font-semibold w-3">%</span>
                <input
                  type="number"
                  min="0"
                  max={totalSizeGB}
                  step="1"
                  value={Math.round(tierAllocation[tier])}
                  onChange={(e) => handleAbsoluteChange(tier, parseFloat(e.target.value))}
                  className="tier-allocation-input w-20 px-1.5 py-1 border border-slate-300 rounded text-xs text-right font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500 font-semibold">GB</span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="0.1"
              value={percentages[tier]}
              onChange={(e) => handlePercentageChange(tier, parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              style={{
                background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${percentages[tier]}%, rgb(226, 232, 240) ${percentages[tier]}%, rgb(226, 232, 240) 100%)`
              }}
            />
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-slate-200">
        <div className="flex justify-between items-center text-xs mb-2">
          <span className="font-bold text-slate-700">
            Total: {Math.round(totalAllocated).toLocaleString('en-US')} GB
          </span>
          <span className={`font-bold ${
            Math.abs(totalPercentage - 100) < 0.1 ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {totalPercentage.toFixed(1)}%
          </span>
        </div>
        {!isValid && (
          <div className="text-[10px] text-rose-600 font-semibold">
            {totalAllocated > totalSizeGB 
              ? 'Allocation exceeds database size' 
              : `Database size exceeds maximum of ${(maxSizeGB / 1024).toLocaleString('en-US')} TB`}
          </div>
        )}
      </div>
    </div>
  );
}
