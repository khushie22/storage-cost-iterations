'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { StorageType, ReplicationType } from '@/lib/pricing';

interface AddComponentProps {
  isOpen: boolean;
  onToggle: () => void;
  visibleTypes: Set<string>;
  onFilterChange: (key: string, visible: boolean) => void;
  onClearAll: () => void;
  onSelectAll: () => void;
}

export default function AddComponent({
  isOpen,
  onToggle,
  visibleTypes,
  onFilterChange,
  onClearAll,
  onSelectAll,
}: AddComponentProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const storageTypes: StorageType[] = ['data-lake', 'blob'];
  const replicationTypes: ReplicationType[] = ['LRS', 'GRS'];

  const getStorageTypeName = (type: StorageType) => {
    return type === 'data-lake' ? 'Azure Data Lake Storage' : 'Azure Blob Storage';
  };

  // Close dropdown when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      if (isOpen) {
        onToggle();
      }
    }
  }, [isOpen, onToggle]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 flex items-center gap-2.5 shadow-lg hover:shadow-xl font-bold text-sm tracking-wide hover:scale-105 active:scale-95"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Component
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200/60 z-50 p-6 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Add Component</h2>
            <div className="flex gap-2">
              <button
                onClick={onSelectAll}
                className="px-4 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-all duration-200 hover:scale-105"
              >
                Select All
              </button>
              <button
                onClick={onClearAll}
                className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-all duration-200 hover:scale-105"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {storageTypes.map((storageType) => (
              <div key={storageType} className="border border-slate-200 rounded-xl p-4 bg-gradient-to-br from-slate-50 to-white">
                <h3 className="font-bold text-slate-800 mb-3 text-sm tracking-wide">{getStorageTypeName(storageType)}</h3>
                <div className="space-y-2.5">
                  {replicationTypes.map((replication) => {
                    const key = `${storageType}-${replication}`;
                    const isVisible = visibleTypes.has(key);
                    return (
                      <label key={replication} className="flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(e) => onFilterChange(key, e.target.checked)}
                          className="mr-3 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-sm text-slate-700 font-semibold group-hover:text-slate-900 transition-colors">{replication}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="border border-slate-200 rounded-xl p-4 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="font-bold text-slate-800 mb-3 text-sm tracking-wide">AWS</h3>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={visibleTypes.has('aws-s3')}
                  onChange={(e) => onFilterChange('aws-s3', e.target.checked)}
                  className="mr-3 w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-sm text-slate-700 font-semibold group-hover:text-slate-900 transition-colors">S3</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
