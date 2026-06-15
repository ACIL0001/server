import fs from 'fs';

const file = 'c:/Users/MY PC/Desktop/election_project/app_election/app/(dashboard)/resultats/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Chunk 1: State
content = content.replace(
  '  const [total, setTotal] = useState(0);',
  '  const [total, setTotal] = useState(0);\n  const [isUpdating, setIsUpdating] = useState(false);'
);

// Chunk 2: handleStatusUpdate
const handleOcrEnd = `    } catch (e: any) {
      alert(e.message || "OCR failed");
    } finally { setIsOcrRunning(false); }
  };`;
const addHandleStatus = `    } catch (e: any) {
      alert(e.message || "OCR failed");
    } finally { setIsOcrRunning(false); }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!modalResult) return;
    try {
      setIsUpdating(true);
      const res = await api.put<any>(\`/results/desk/\${modalResult._id}/status\`, { status });
      if (res.ok) {
        setModalResult({ ...modalResult, status });
        fetchResults();
        fetchOcrSummary();
      } else {
        alert(res.message || "Failed to update status");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };`;
content = content.replace(handleOcrEnd, addHandleStatus);

// Chunk 3: PVModal Props in JSX
content = content.replace(
  '            ocrDone={ocrDone}\n            onRunOcr={handleRunOcr}',
  '            ocrDone={ocrDone}\n            isUpdating={isUpdating}\n            onUpdateStatus={handleStatusUpdate}\n            onRunOcr={handleRunOcr}'
);

// Chunk 4: PVModal Definition Props
const pvModalDef = `function PVModal({ result, canTriggerOcr, isOcrRunning, ocrDone, onRunOcr, onClose, onFullscreen }: {
  result: ResultRecord;
  canTriggerOcr: boolean;
  isOcrRunning: boolean;
  ocrDone: boolean;
  onRunOcr: () => void;
  onClose: () => void;
  onFullscreen: (url: string) => void;
}) {`;
const newPvModalDef = `function PVModal({ result, canTriggerOcr, isOcrRunning, ocrDone, isUpdating, onUpdateStatus, onRunOcr, onClose, onFullscreen }: {
  result: ResultRecord;
  canTriggerOcr: boolean;
  isOcrRunning: boolean;
  ocrDone: boolean;
  isUpdating?: boolean;
  onUpdateStatus?: (status: string) => void;
  onRunOcr: () => void;
  onClose: () => void;
  onFullscreen: (url: string) => void;
}) {`;
content = content.replace(pvModalDef, newPvModalDef);

// Chunk 5: Add Buttons
const ocrActionRegex = /\{\/\* OCR Action \*\/\}\s*\{canTriggerOcr && \([\s\S]*?Utilisera Tesseract\.js en local\s*<\/p>\s*<\/div>\s*\)\}/m;
const newActions = `{/* Actions */}
            <div className="p-6 mt-auto border-t border-zinc-100 dark:border-white/10 space-y-3">
              {onUpdateStatus && (
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateStatus("rejected")}
                    disabled={isUpdating || isOcrRunning}
                    className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-all">
                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                    Refuser
                  </button>
                  <button
                    onClick={() => onUpdateStatus("ocr_human_done")}
                    disabled={isUpdating || isOcrRunning}
                    className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 disabled:opacity-50 transition-all">
                    {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                    Accepter
                  </button>
                </div>
              )}
              {canTriggerOcr && (
                <div>
                  <button
                    onClick={onRunOcr}
                    disabled={isOcrRunning || ocrDone}
                    className={cn(
                      "w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all",
                      ocrDone
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 cursor-default"
                        : "bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                    )}>
                    {isOcrRunning ? (
                      <><Loader2 size={16} className="animate-spin" /> Traitement OCR...</>
                    ) : ocrDone ? (
                      <><CheckCircle size={16} /> OCR Terminé</>
                    ) : (
                      <><Zap size={16} /> Relancer l'OCR</>
                    )}
                  </button>
                  <p className="text-[9px] text-zinc-400 text-center mt-2 font-medium">
                    Utilisera Tesseract.js en local
                  </p>
                </div>
              )}
            </div>`;
content = content.replace(ocrActionRegex, newActions);

fs.writeFileSync(file, content);
console.log('Successfully updated app_election UI');
