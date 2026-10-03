import React, { useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Crop, Sparkles, X, Clipboard } from 'lucide-react';

export default function ImageDropzone({ selectedImage, setSelectedImage, onTriggerCrop, isLoading, onAnalyze, activeMode }) {
  const fileInputRef = useRef(null);

  // Global Clipboard Paste Listener
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setSelectedImage(event.target.result);
            };
            reader.readAsDataURL(file);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setSelectedImage]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {!selectedImage ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="group relative cursor-pointer border-2 border-dashed border-zinc-700/80 hover:border-purple-500/80 rounded-2xl p-8 transition-all bg-zinc-900/30 hover:bg-zinc-900/60 flex flex-col items-center justify-center text-center gap-3 overflow-hidden"
        >
          <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 group-hover:bg-purple-600/20 group-hover:text-purple-400 text-zinc-400 flex items-center justify-center transition-all shadow-inner">
            <UploadCloud className="w-7 h-7 transition-transform group-hover:-translate-y-1" />
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-200 group-hover:text-white">
              Drop a screenshot or <span className="text-purple-400 underline underline-offset-4">browse file</span>
            </p>
            <p className="text-xs text-zinc-500 mt-1 flex items-center justify-center gap-1.5">
              <Clipboard className="w-3.5 h-3.5" /> Press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-300 font-mono">Cmd + V</kbd> to paste anywhere
            </p>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTriggerCrop();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition-all"
            >
              <Crop className="w-3.5 h-3.5" />
              Crop Screen Area
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="relative rounded-2xl border border-white/10 bg-zinc-900/50 p-3 overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Action Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              <span>Loaded Screenshot</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Remove Image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Image Preview */}
          <div className="relative max-h-72 w-full rounded-xl overflow-hidden bg-black/60 flex items-center justify-center border border-white/5 group">
            <img
              src={selectedImage}
              alt="Selected screenshot"
              className="max-h-72 object-contain rounded-lg transition-transform group-hover:scale-[1.01]"
            />
          </div>

          {/* Quick Action Button */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onTriggerCrop}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
            >
              <Crop className="w-3.5 h-3.5" />
              Re-crop Screen
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={onAnalyze}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all"
            >
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              {isLoading ? 'Analyzing Screen...' : activeMode === 'ocr' ? 'Extract Text with EasyOCR' : activeMode === 'code' ? 'Generate React Code' : 'Analyze with Gemini'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
