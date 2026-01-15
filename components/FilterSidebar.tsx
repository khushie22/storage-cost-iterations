'use client';

import React from 'react';
import { StorageType, ReplicationType } from '@/lib/pricing';

interface FilterSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  visibleTypes: Set<string>;
  onFilterChange: (key: string, visible: boolean) => void;
  onClearAll: () => void;
  onSelectAll: () => void;
}

export default function FilterSidebar({
  isOpen,
  onToggle,
  visibleTypes,
  onFilterChange,
  onClearAll,
  onSelectAll,
}: FilterSidebarProps) {
  const storageTypes: StorageType[] = ['data-lake', 'blob'];
  const replicationTypes: ReplicationType[] = ['LRS', 'GRS'];

  const getStorageTypeName = (type: StorageType) => {
    return type === 'data-lake' ? 'Azure Data Lake Storage' : 'Azure Blob Storage';
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed right-0 top-0 h-full bg-white shadow-lg z-40 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ width: '280px' }}
      >
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Filter Options</h2>
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close filter sidebar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={onSelectAll}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={onClearAll}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-4">
            {storageTypes.map((storageType) => (
              <div key={storageType} className="border border-gray-200 rounded-lg p-3">
                <h3 className="font-semibold text-gray-800 mb-2 text-sm">{getStorageTypeName(storageType)}</h3>
                <div className="space-y-2">
                  {replicationTypes.map((replication) => {
                    const key = `${storageType}-${replication}`;
                    const isVisible = visibleTypes.has(key);
                    return (
                      <label key={replication} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(e) => onFilterChange(key, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{replication}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="border border-gray-200 rounded-lg p-3">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">AWS</h3>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={visibleTypes.has('aws-s3')}
                  onChange={(e) => onFilterChange('aws-s3', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">S3</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay when sidebar is open (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
