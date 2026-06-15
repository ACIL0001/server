import fs from 'fs';

const file = 'c:/Users/MY PC/Desktop/election_project/Election day/app/(dashboard)/resultats/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Chunk 1: State
content = content.replace(
  '  const [total, setTotal] = useState(0);',
  '  const [total, setTotal] = useState(0);\n  const [isUpdating, setIsUpdating] = useState(false);'
);

// Chunk 2: Add handleStatusUpdate before fetchResults
const fetchResultsStart = '  const fetchResults = async () => {';
const handleStatusUpdate = `  const handleStatusUpdate = async (status: string) => {
    if (!modalResult) return;
    try {
      setIsUpdating(true);
      const res = await api.put<any>(\`/results/desk/\${modalResult._id}/status\`, { status });
      if (res.ok) {
        setModalResult({ ...modalResult, status });
        fetchResults();
      } else {
        alert(res.message || "Failed to update status");
      }
    } catch (e: any) {
      alert(e.message || "An error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

`;
content = content.replace(fetchResultsStart, handleStatusUpdate + fetchResultsStart);

// Chunk 3: Add buttons below Mismatch warning
const mismatchWarningRegex = /\{\/\* Mismatch warning \*\/\}\s*\{modalResult\.status === "mismatch" && \([\s\S]*?<\/div>\s*\)\}/m;

const newFooter = `{/* Actions / Mismatch warning */}
              <div className="flex flex-col border-t border-zinc-100 dark:border-white/10">
                {modalResult.status === "mismatch" && (
                  <div className="flex items-center gap-3 px-6 py-4 bg-red-500/5">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    <p className="text-[11px] font-bold text-red-500">
                      Divergence de {Math.abs((modalResult.ocr_extracted_total ?? 0) - modalResult.total)} voix entre la saisie manuelle et le résultat OCR.
                    </p>
                  </div>
                )}
                {(modalResult.status === "mismatch" || modalResult.status === "verified" || modalResult.status === "rejected" || modalResult.status === "ocr_human_done" || modalResult.status === "ocr_done") && (
                  <div className="flex items-center justify-end gap-3 px-6 py-4 bg-zinc-50 dark:bg-white/3">
                    <button
                      onClick={() => handleStatusUpdate("rejected")}
                      disabled={isUpdating}
                      className="px-4 h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50 transition-all">
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      Refuser
                    </button>
                    <button
                      onClick={() => handleStatusUpdate("ocr_human_done")}
                      disabled={isUpdating}
                      className="px-4 h-10 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-500 hover:bg-teal-500/20 disabled:opacity-50 transition-all">
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      Accepter
                    </button>
                  </div>
                )}
              </div>`;

content = content.replace(mismatchWarningRegex, newFooter);

fs.writeFileSync(file, content);
console.log('Successfully updated Election day UI');
