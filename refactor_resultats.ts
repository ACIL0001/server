import fs from 'fs';

const file = 'c:/Users/MY PC/Desktop/election_project/app_election/app/(dashboard)/resultats/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove activeTab state
content = content.replace(
  'const [activeTab, setActiveTab] = useState<"votes" | "pv">("votes");\n  const [results, setResults] = useState<ResultRecord[]>([]);',
  'const [results, setResults] = useState<ResultRecord[]>([]);'
);

// 2. Add grouping logic before statCards
const groupingLogic = `
  // Grouped by unique desk ID
  const deskIds = Array.from(new Set(results.map(r => r.desk?._id).filter(Boolean))) as string[];
  const byDesk: Record<string, ResultRecord[]> = {};
  for (const r of results) {
    const id = r.desk?._id ?? "unknown";
    if (!byDesk[id]) byDesk[id] = [];
    byDesk[id].push(r);
  }

  const statCards`;
content = content.replace('  const statCards', groupingLogic);

// 3. Remove Tabs UI
const tabsRegex = /\{\/\* Tabs \*\/\}\s*<div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-white\/5 rounded-2xl w-fit">[\s\S]*?<\/div>/m;
content = content.replace(tabsRegex, '');

// 4. Replace Tab Content with new Grouping UI
const groupingUI = `      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="animate-spin text-emerald-500" size={28} />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-zinc-400 bg-white dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5 mt-6">
          <FileText size={36} className="opacity-20" />
          <p className="text-sm font-semibold">Aucun résultat trouvé pour ces filtres</p>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {deskIds.map(deskId => {
            const bureauResults = byDesk[deskId] || [];
            const deskNumber = bureauResults[0]?.desk?.desk_number;
            const deskType = bureauResults[0]?.desk?.type;
            const hasMismatch = bureauResults.some(r => r.status === "mismatch");
            const allVerified = bureauResults.every(r => r.status === "verified");
            const pvResult = bureauResults.find(r => r.hasImage);

            return (
              <motion.div key={deskId}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "bg-white dark:bg-white/5 rounded-2xl border overflow-hidden",
                  hasMismatch ? "border-red-500/30" : allVerified ? "border-emerald-500/20" : "border-zinc-100 dark:border-white/5"
                )}>
                {/* Bureau header */}
                <div className={cn(
                  "flex items-center justify-between px-6 py-4 border-b",
                  hasMismatch ? "bg-red-500/5 border-red-500/10" : allVerified ? "bg-emerald-500/5 border-emerald-500/10" : "bg-zinc-50 dark:bg-white/3 border-zinc-100 dark:border-white/5"
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center text-sm font-black",
                      hasMismatch ? "bg-red-500/10 text-red-500" : allVerified ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-200 dark:bg-white/10 text-zinc-600 dark:text-zinc-400"
                    )}>
                      #{deskNumber || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900 dark:text-white">Bureau #{deskNumber || "?"}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                        {deskType === "male" ? "Hommes" : deskType === "female" ? "Femmes" : "—"} · {bureauResults.length} candidat{bureauResults.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasMismatch && (
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-wider">
                        <AlertTriangle size={12} /> Divergence
                      </span>
                    )}
                    {allVerified && !hasMismatch && (
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                        <CheckCircle size={12} /> Tout vérifié
                      </span>
                    )}
                    {pvResult && (
                      <button onClick={() => { setModalResult(pvResult); setOcrDone(false); }}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider hover:bg-blue-500/20 transition-all">
                        <ImageIcon size={11} /> Voir PV
                      </button>
                    )}
                  </div>
                </div>

                {/* Results table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-50 dark:border-white/3">
                        <th className="text-left px-6 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400">Candidat</th>
                        <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400">Parti</th>
                        <th className="text-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400">Voix Saisies</th>
                        <th className="text-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400">OCR</th>
                        <th className="text-center px-4 py-3 text-[9px] font-black uppercase tracking-widest text-zinc-400">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bureauResults.map((r, i) => {
                        const rowMismatch = r.status === "mismatch";
                        const rowVerified = r.status === "verified";
                        return (
                          <tr key={r._id}
                            className={cn(
                              "border-b border-zinc-50 dark:border-white/3 transition-colors",
                              rowMismatch ? "bg-red-500/[0.02] hover:bg-red-500/[0.04]" : "hover:bg-zinc-50 dark:hover:bg-white/3"
                            )}>
                            <td className="px-6 py-3 font-bold text-zinc-900 dark:text-white">{r.candidat?.full_name || "—"}</td>
                            <td className="px-4 py-3 text-xs text-zinc-500">{r.party?.name || "—"}</td>
                            <td className="px-4 py-3 text-center font-black text-zinc-900 dark:text-white">{r.total}</td>
                            <td className={cn("px-4 py-3 text-center font-black font-mono",
                              rowMismatch ? "text-red-500" : rowVerified ? "text-emerald-500" : "text-zinc-400")}>
                              {r.ocr_extracted_total ?? "—"}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Page {page} / {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="h-9 px-4 flex items-center gap-1.5 rounded-xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-white/10 disabled:opacity-30 transition-all">
                  <ChevronLeft size={14} /> Précédent
                </button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="h-9 px-4 flex items-center gap-1.5 rounded-xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-white/10 disabled:opacity-30 transition-all">
                  Suivant <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}`;

const tabContentRegex = /\{\/\* Tab Content \*\/\}\s*<AnimatePresence mode="wait">[\s\S]*?<\/AnimatePresence>/m;
content = content.replace(tabContentRegex, groupingUI);

// 5. Remove VotesTable and PVGrid definitions
const votesTableRegex = /\/\/ ────────── Votes Table ──────────[\s\S]*?(?=\/\/ ────────── PV Modal ──────────)/m;
content = content.replace(votesTableRegex, '');

fs.writeFileSync(file, content);
console.log('Successfully refactored page.tsx');
