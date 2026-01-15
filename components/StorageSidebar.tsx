'use client';

import React from 'react';
import { TierAllocation } from '@/lib/costCalculator';

interface StorageSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  totalSizeGB: number;
  tierAllocation: TierAllocation;
  numberOfDatabases: number;
  onSizeChange: (sizeGB: number) => void;
  onAllocationChange: (allocation: TierAllocation) => void;
  onNumberOfDatabasesChange: (count: number) => void;
  onEvaluate?: () => void;
}

export default function StorageSidebar({
  isOpen,
  onToggle,
  totalSizeGB,
  tierAllocation,
  numberOfDatabases,
  onSizeChange,
  onAllocationChange,
  onNumberOfDatabasesChange,
  onEvaluate,
}: StorageSidebarProps) {
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
    <>
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white shadow-lg z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ width: '320px' }}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Storage Configuration</h2>
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              All databases have identical configuration
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-xs text-gray-500">Max: {maxSizeGB.toLocaleString('en-US')} GB ({(maxSizeGB / 1024).toLocaleString('en-US')} TB)</span>
          </div>

          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Tier Allocation</h3>
            {(['hot', 'cold', 'archive'] as const).map((tier) => (
              <div key={tier} className="mb-2 border border-gray-200 rounded-md p-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-700 capitalize">
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
                      className="w-14 px-1.5 py-0.5 border border-gray-300 rounded text-xs text-right"
                    />
                    <span className="text-xs text-gray-500 w-3">%</span>
                    <input
                      type="number"
                      min="0"
                      max={totalSizeGB}
                      step="1"
                      value={Math.round(tierAllocation[tier])}
                      onChange={(e) => handleAbsoluteChange(tier, parseFloat(e.target.value))}
                      className="w-20 px-1.5 py-0.5 border border-gray-300 rounded text-xs text-right"
                    />
                    <span className="text-xs text-gray-500">GB</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={percentages[tier]}
                  onChange={(e) => handlePercentageChange(tier, parseFloat(e.target.value))}
                  className="w-full h-1.5"
                />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm mb-3">
              <span className="font-medium text-gray-700">
                Total: {Math.round(totalAllocated).toLocaleString('en-US')} GB
              </span>
              <span className={`font-medium ${
                Math.abs(totalPercentage - 100) < 0.1 ? 'text-green-600' : 'text-red-600'
              }`}>
                {totalPercentage.toFixed(1)}%
              </span>
            </div>
            {!isValid && (
              <div className="mb-3 text-xs text-red-600">
                {totalAllocated > totalSizeGB 
                  ? 'Allocation exceeds database size' 
                  : `Database size exceeds maximum of ${(maxSizeGB / 1024).toLocaleString('en-US')} TB`}
              </div>
            )}
            {onEvaluate && (
              <button
                onClick={onEvaluate}
                className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
              >
                Evaluate Costs
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Toggle button when sidebar is closed (mobile only) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-4 z-40 bg-blue-600 text-white p-2 rounded-md shadow-lg hover:bg-blue-700 lg:hidden"
          aria-label="Open sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Desktop toggle button (always visible on desktop) */}
      <button
        onClick={onToggle}
        className="hidden lg:flex fixed z-40 bg-gray-600 text-white p-2 rounded-md shadow-lg hover:bg-gray-700 transition-all"
        style={{ left: isOpen ? '320px' : '4px', top: '4px' }}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          )}
        </svg>
      </button>
    </>
  );
}

