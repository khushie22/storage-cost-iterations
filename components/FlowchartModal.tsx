'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface FlowchartModalProps {
  isOpen: boolean;
  onClose: () => void;
  flowchartCode: string;
  title: string;
}

export default function FlowchartModal({
  isOpen,
  onClose,
  flowchartCode,
  title,
}: FlowchartModalProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1.1); // Start at 110%
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!isOpen || !flowchartCode || !mermaidRef.current) {
      return;
    }

    // Reset zoom when modal opens
    setZoom(1.1);

    // Initialize mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        nodeSpacing: 40,
        rankSpacing: 60,
        padding: 15,
      },
      themeVariables: {
        fontSize: '12px',
        fontFamily: 'Inter, system-ui, sans-serif',
        primaryColor: '#6366f1',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#818cf8',
        lineColor: '#cbd5e1',
        secondaryColor: '#f1f5f9',
        tertiaryColor: '#e2e8f0',
      },
    });

    const renderMermaid = async () => {
      if (!mermaidRef.current || !containerRef.current) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        mermaidRef.current.innerHTML = '';
        
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, flowchartCode);
        
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
          
          const svgElement = mermaidRef.current.querySelector('svg');
          if (svgElement && containerRef.current) {
            svgElement.style.display = 'block';
            svgElement.style.transformOrigin = '0 0';
            
            // Get SVG dimensions
            const svgWidth = svgElement.viewBox?.baseVal?.width || svgElement.clientWidth || 1000;
            const svgHeight = svgElement.viewBox?.baseVal?.height || svgElement.clientHeight || 1000;
            setSvgSize({ width: svgWidth, height: svgHeight });
            
          }
          
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('Error rendering Mermaid diagram:', err);
        setError(err.message || 'Failed to render flowchart');
        setIsLoading(false);
        
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `
            <div class="text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
              <p class="font-bold mb-2">Error rendering flowchart:</p>
              <p class="text-sm">${err.message || 'Unknown error'}</p>
            </div>
          `;
        }
      }
    };

    renderMermaid();
  }, [isOpen, flowchartCode]);

  // Zoom functions
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 1.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.15));
  };

  const handleFitToScreen = () => {
    if (!containerRef.current || svgSize.width === 0) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const padding = 40;
    
    const scaleX = (containerWidth - padding) / svgSize.width;
    const scaleY = (containerHeight - padding) / svgSize.height;
    const newZoom = Math.min(scaleX, scaleY, 1);
    
    setZoom(newZoom);
  };

  const handleReset = () => {
    setZoom(1.1);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setZoom((prev) => Math.max(0.15, Math.min(1.5, prev + delta)));
    }
  };

  // Download as PNG
  const handleDownloadPNG = async () => {
    if (!mermaidRef.current) return;

    const svgElement = mermaidRef.current.querySelector('svg');
    if (!svgElement) return;

    try {
      // Clone the SVG to avoid modifying the original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Get SVG dimensions
      const svgWidth = svgElement.viewBox?.baseVal?.width || svgElement.clientWidth || 1000;
      const svgHeight = svgElement.viewBox?.baseVal?.height || svgElement.clientHeight || 1000;

      // Create a canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size
      canvas.width = svgWidth;
      canvas.height = svgHeight;

      // Create image from SVG
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      
      img.onload = () => {
        // Draw image on canvas
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // Convert to PNG and download
        canvas.toBlob((blob) => {
          if (blob) {
            const downloadUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${title.replace(/\s+/g, '-')}-flowchart.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(downloadUrl);
          }
          URL.revokeObjectURL(url);
        }, 'image/png');
      };

      img.onerror = () => {
        console.error('Error loading SVG image');
        URL.revokeObjectURL(url);
      };

      img.src = url;
    } catch (error) {
      console.error('Error downloading PNG:', error);
    }
  };


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-[49vw] h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-800 truncate pr-4">
            {title}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-slate-50 rounded-lg border border-slate-200 p-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                title="Zoom Out"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <button
                onClick={handleFitToScreen}
                className="px-2 py-1 text-[10px] font-medium text-slate-600 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                title="Fit to Screen"
              >
                Fit
              </button>
              <span className="px-1.5 text-[10px] font-medium text-slate-500 min-w-[2.5rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                title="Zoom In"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>
              <div className="w-px h-3 bg-slate-200 mx-0.5"></div>
              <button
                onClick={handleReset}
                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-white rounded transition-colors"
                title="Reset View"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <button
              onClick={handleDownloadPNG}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm hover:shadow"
              title="Download as PNG"
              disabled={isLoading || !!error}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PNG
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-50 relative"
          onWheel={handleWheel}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto mb-2"></div>
                <p className="text-slate-500 text-xs">Loading flowchart...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="text-red-600 p-4 bg-red-50 rounded-lg border border-red-200 max-w-md">
                <p className="font-semibold mb-1 text-sm">Error:</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-center min-h-full p-8">
            <div
              ref={mermaidRef}
              className="mermaid-container"
              style={{ 
                display: isLoading ? 'none' : 'block',
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
            />
          </div>
          
          {/* Minimal Instructions */}
          {!isLoading && !error && (
            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-md border border-slate-200 px-2 py-1.5 text-[10px] text-slate-500 shadow-sm pointer-events-none">
              <p>Ctrl/Cmd + Scroll to zoom</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
