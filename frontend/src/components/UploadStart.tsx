import React, { useRef, useState } from 'react';
import { AlertTriangle, FileImage, Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
import type { DetectionSet } from '../lib/types';
import { getDetections, uploadImageFile } from '../lib/api';

interface UploadStartProps { onClose: () => void; onComplete: (result: DetectionSet) => void; }

/** Empty inspector state: tactical upload modal for direct satellite image analysis. */
export const UploadStart: React.FC<UploadStartProps> = ({ onClose, onComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [gsd, setGsd] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!file) return;
    setBusy(true); setError(null);
    const uploaded = await uploadImageFile(file, file.name, gsd ? Number(gsd) : undefined);
    if (uploaded.kind !== 'ok') { setError(uploaded.message); setBusy(false); return; }
    const detected = await getDetections(uploaded.data.id, false);
    setBusy(false);
    if (detected.kind === 'ok') onComplete(detected.data);
    else setError(detected.message);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono select-none">
      <div className="w-full max-w-lg rounded-lg border border-[#2A3447] bg-[#0E131F] p-5 text-slate-200 shadow-2xl tactical-corners">
        <div className="mb-4 flex items-center justify-between pb-3 border-b border-[#1E2638]">
          <div className="flex items-center gap-2">
            <UploadCloud className="text-[#F2B84B] w-5 h-5" />
            <h2 className="font-bold text-xs uppercase tracking-wider text-white">Upload Satellite Recon Imagery</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <input ref={input} className="hidden" type="file" accept=".tif,.tiff,.png,.jpg,.jpeg" onChange={event => setFile(event.target.files?.[0] ?? null)} />
        <button className="w-full rounded border border-[#2A3447] bg-[#111827] hover:bg-[#161D2B] p-3 text-left transition-colors" onClick={() => input.current?.click()}>
          <FileImage className="mr-2 inline text-[#24C6C8] w-4 h-4" />
          <span className="text-xs text-slate-200">{file?.name ?? 'Choose GeoTIFF, PNG, or JPEG raster'}</span>
        </button>
        <label className="mt-3 block text-[11px] text-slate-400">
          Sensor GSD (m/pixel):
          <input value={gsd} onChange={event => setGsd(event.target.value)} type="number" min="0.1" step="0.1" placeholder="e.g. 0.5" className="ml-2 w-24 rounded bg-[#111827] border border-[#2A3447] px-2 py-1 text-xs text-white focus:outline-none focus:border-[#F2B84B]" />
        </label>
        {error && <p className="mt-3 flex gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-800/40 p-2.5 rounded"><AlertTriangle size={15} />{error}</p>}
        <button disabled={!file || busy} onClick={submit} className="mt-5 flex w-full justify-center items-center gap-2 rounded bg-[#F2B84B] hover:bg-[#f5c76d] text-black p-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-40 transition-all shadow">
          {busy ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          {busy ? 'Processing multi-band raster...' : 'Ingest & Analyze Imagery'}
        </button>
      </div>
    </div>
  );
};
