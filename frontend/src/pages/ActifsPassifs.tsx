import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  getDashboard, 
  getLiabilities, 
  addSnapshot, 
  exportCSV, 
  getAssets, 
  getHistory, 
  createAsset, 
  deleteAsset, 
  createLiability, 
  deleteLiability, 
  getBanks, 
  updateAsset, 
  updateLiability, 
  importCSV, 
  deleteSnapshot 
} from "../api";
import { todayLocal } from "../date";
import type { AssetDetails } from "../types";
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingDown, 
  Landmark, 
  Download, 
  Plus, 
  Trash2, 
  X, 
  Building2, 
  Upload, 
  ChevronRight, 
  History as HistoryIcon,
  TriangleAlert
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { money } from "../format";
import { accountLabel } from "../accounts";
import { RowActions } from "../components/RowActions";

interface DashboardData {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

interface Snapshot {
  id: number;
  date: string;
  amount: number;
}

interface Liability {
  id: number;
  name: string;
  type: string;
  snapshots: Snapshot[];
  credits: { name: string; type: string; limit?: number }[];
}

interface Asset {
  id: number;
  name: string;
  type: string;
  location?: string;
  bank_id?: number;
  details?: AssetDetails | null;
  snapshots: Snapshot[];
}

interface Bank {
  id: number;
  name: string;
}

const NEGATIVE_HINT = "Solde négatif : il manque sans doute une entrée d'argent, ou le solde réel est à saisir.";

interface HistoryItem {
  date: string;
  assets: number | null;       // null before the first recorded asset value
  liabilities: number;
  net_worth: number | null;
}

// A history item placed on a time axis: the charts space the points by the time between them,
// so the yearly balances of the past years keep their place beside the frequent recent ones
type HistoryPoint = HistoryItem & { time: number };

const toPoints = (items: HistoryItem[]): HistoryPoint[] =>
  items.map((h) => ({ ...h, time: new Date(`${h.date}T00:00:00`).getTime() }));

// Beyond this many points, the dots of a line merge into a thick stroke
const MAX_DOTS = 40;

const fullDate = (time: unknown) =>
  new Date(Number(time)).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

/** Time axis of a history chart: a tick per year over two years or more, a tick per month below. */
function timeAxis(points: HistoryPoint[]) {
  const ticks: number[] = [];
  let yearly = false;
  if (points.length > 0) {
    const first = new Date(points[0].time);
    const last = new Date(points[points.length - 1].time);
    yearly = last.getFullYear() - first.getFullYear() >= 2;
    const tick = yearly ? new Date(first.getFullYear() + 1, 0, 1) : new Date(first.getFullYear(), first.getMonth() + 1, 1);
    while (tick <= last) {
      ticks.push(tick.getTime());
      if (yearly) tick.setFullYear(tick.getFullYear() + 1);
      else tick.setMonth(tick.getMonth() + 1);
    }
    if (ticks.length === 0) ticks.push(points[0].time);
  }
  const label = (time: number) =>
    yearly ? String(new Date(time).getFullYear()) : new Date(time).toLocaleDateString(undefined, { month: "short", year: "numeric" });
  return (
    <XAxis
      dataKey="time"
      type="number"
      scale="time"
      domain={["dataMin", "dataMax"]}
      ticks={ticks}
      tickFormatter={label}
      axisLine={false}
      tickLine={false}
      tick={{fill: '#64748b', fontSize: 12}}
      dy={10}
    />
  );
}

export function ActifsPassifs() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Creation States
  const [isAddingLiability, setIsAddingLiability] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState("");
  const [newItemLocation, setNewItemLocation] = useState("");
  const [newItemBankId, setNewItemBankId] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");

  // Editing States
  const [editingMetadataId, setEditingMetadataId] = useState<number | null>(null);
  const [editingAssetMetadataId, setEditingAssetMetadataId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBankId, setEditBankId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editFixedValue, setEditFixedValue] = useState<string>("");
  
  const [showHistoryFor, setShowHistoryFor] = useState<{id: number, type: 'asset' | 'liability'} | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayStr = todayLocal();

  // Current value of an account: its last balance up to today, or its fixed value
  const assetAmount = (a: Asset) => {
    const snapshots = [...a.snapshots].filter(s => s.date <= todayStr).sort((x,y) => new Date(x.date).getTime() - new Date(y.date).getTime() || x.id - y.id);
    return snapshots[snapshots.length - 1]?.amount || a.details?.value || 0;
  };

  // State only changes in the promise callbacks, once the requests are done: the initial load can run in an effect
  const loadData = () =>
    Promise.all([
      getDashboard(),
      getLiabilities(),
      getAssets(),
      getHistory(),
      getBanks()
    ])
      .then(([dashRes, liabRes, assetRes, histRes, bankRes]) => {
        setDashboard(dashRes.data);
        setLiabilities(liabRes.data);
        setAssets(assetRes.data);
        setHistory(histRes.data);
        setBanks(bankRes.data);
      })
      .catch((err) => {
        console.error("Failed to fetch data:", err);
        setError(`Impossible de charger les données (${err instanceof Error ? err.message : 'Erreur inconnue'}).`);
      })
      .finally(() => setIsLoading(false));

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateLiability = async (id: number) => {
    try {
      await updateLiability(id, { name: editName, type: editType });
      if (editAmount !== "" && !isNaN(parseFloat(editAmount))) {
        await addSnapshot({
          liability_id: id,
          amount: parseFloat(editAmount),
          date: todayStr,
        });
      }
      setEditingMetadataId(null);
      refreshData();
    } catch {
      alert("Erreur lors de la modification");
    }
  };

  const handleUpdateAsset = async (id: number) => {
    try {
      await updateAsset(id, { 
        name: editName, 
        type: editType, 
        location: editLocation,
        bank_id: editBankId === "" ? null : parseInt(editBankId),
        details: { value: editFixedValue === "" ? null : (isNaN(parseFloat(editFixedValue)) ? null : parseFloat(editFixedValue)) }
      });
      if (editAmount !== "" && !isNaN(parseFloat(editAmount))) {
        await addSnapshot({
          asset_id: id,
          amount: parseFloat(editAmount),
          date: todayStr,
        });
      }
      setEditingAssetMetadataId(null);
      refreshData();
    } catch {
      alert("Erreur lors de la modification");
    }
  };

  const handleDeleteSnapshot = async (sid: number) => {
    if (!window.confirm("Supprimer ce relevé historique ?")) return;
    try {
      await deleteSnapshot(sid);
      refreshData();
    } catch {
      alert("Erreur lors de la suppression du relevé");
    }
  };

  const handleAddLiability = async () => {
    if (!newItemName || !newItemType) return;
    try {
      const res = await createLiability({ name: newItemName, type: newItemType });
      if (newItemAmount) {
        await addSnapshot({
          liability_id: res.data.id,
          amount: parseFloat(newItemAmount),
          date: todayStr,
        });
      }
      setIsAddingLiability(false);
      setNewItemName("");
      setNewItemType("");
      setNewItemAmount("");
      refreshData();
    } catch {
      alert("Erreur lors de l'ajout de la dette");
    }
  };

  const handleDeleteLiability = async (id: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette dette ?")) return;
    try {
      await deleteLiability(id);
      refreshData();
    } catch {
      alert("Erreur lors de la suppression");
    }
  };

  const handleAddAsset = async () => {
    if (!newItemName || !newItemType) return;
    try {
      const res = await createAsset({ 
        name: newItemName, 
        type: newItemType, 
        location: newItemLocation,
        bank_id: newItemBankId === "" ? null : parseInt(newItemBankId)
      });
      if (newItemAmount) {
        await addSnapshot({
          asset_id: res.data.id,
          amount: parseFloat(newItemAmount),
          date: todayStr,
        });
      }
      setIsAddingAsset(false);
      setNewItemName("");
      setNewItemType("");
      setNewItemLocation("");
      setNewItemBankId("");
      setNewItemAmount("");
      refreshData();
    } catch {
      alert("Erreur lors de l'ajout de l'actif");
    }
  };

  const handleLinkBank = async (assetId: number, bankId: string) => {
    try {
      await updateAsset(assetId, { bank_id: bankId === "" ? null : parseInt(bankId) });
      refreshData();
    } catch {
      alert("Erreur lors de la liaison à la banque");
    }
  };

  const handleDeleteAsset = async (id: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet actif ?")) return;
    try {
      await deleteAsset(id);
      refreshData();
    } catch {
      alert("Erreur lors de la suppression");
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importCSV(file);
      refreshData();
      alert("Importation réussie");
    } catch {
      alert("Erreur lors de l'importation");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Chargement des données...</div>;

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl border border-rose-200 inline-block">
          <p className="font-bold mb-2">{error}</p>
          <button onClick={refreshData} className="text-sm underline font-bold">Réessayer</button>
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  const points = toPoints(history);
  // The net worth needs the assets: it starts at their first recorded value
  const netWorthPoints = points.filter((p) => p.net_worth !== null);
  const negativeAssets = assets.filter((a) => assetAmount(a) < 0);

  return (
    <div className="p-4 md:p-6 font-sans text-slate-900">
      <header className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg">
            <LayoutDashboard size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tableau de Bord Financier</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshData}
            className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
            title="Rafraîchir"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
          </button>
          <label className="flex items-center gap-2 bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-all shadow-sm active:scale-95 cursor-pointer">
            <Upload size={18} />
            <span className="font-semibold">Importer CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
          >
            <Download size={18} />
            <span className="font-semibold">Exporter CSV</span>
          </button>
        </div>
      </header>

      {negativeAssets.length > 0 && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-sm">
          <TriangleAlert size={20} className="shrink-0 mt-0.5" />
          <p>
            Solde négatif : {negativeAssets.map((a) => `${accountLabel(a, assets)} (${money(assetAmount(a))})`).join(", ")}.
            Il manque sans doute une entrée d'argent (page <Link to="/entrees" className="underline font-semibold">Entrées</Link>),
            ou le solde réel est à saisir.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <Landmark size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Actifs Totaux</span>
          </div>
          <div className="text-3xl font-extrabold">{money(dashboard.total_assets)}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <TrendingDown size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Passifs Totaux</span>
          </div>
          <div className="text-3xl font-extrabold">{money(dashboard.total_liabilities)}</div>
        </div>

        <div className="bg-blue-600 p-5 rounded-2xl shadow-lg border border-blue-500 text-white transform hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Wallet size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Valeur Nette</span>
          </div>
          <div className="text-3xl font-extrabold">{money(dashboard.net_worth)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                Évolution de la Valeur Nette
              </h2>
              {netWorthPoints.length > 0 && netWorthPoints.length < points.length && (
                <p className="text-xs text-slate-500 mt-1">
                  Depuis la première valeur d'actif enregistrée, le {fullDate(netWorthPoints[0].time)}
                </p>
              )}
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={netWorthPoints}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                {timeAxis(netWorthPoints)}
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#64748b', fontSize: 12}}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  labelFormatter={fullDate}
                  formatter={(value) => [money(Number(value)), 'Valeur Nette']}
                />
                <Line
                  type="monotone"
                  dataKey="net_worth"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={netWorthPoints.length > MAX_DOTS ? false : { r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-6 bg-rose-500 rounded-full"></span>
              Évolution des Passifs
            </h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                {timeAxis(points)}
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#64748b', fontSize: 12}}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  labelFormatter={fullDate}
                  formatter={(value) => [money(Number(value)), 'Passifs']}
                />
                <Line
                  type="monotone"
                  dataKey="liabilities"
                  stroke="#f43f5e"
                  strokeWidth={3}
                  dot={points.length > MAX_DOTS ? false : { r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <TrendingDown className="text-rose-500" size={22} />
              Liste des Dettes
            </h2>
            <button 
              onClick={() => setIsAddingLiability(true)}
              aria-label="Ajouter une dette"
              className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {isAddingLiability && (
            <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700">Nouvelle Dette</h3>
                <button onClick={() => setIsAddingLiability(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nom"
                  className="rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLiability()}
                  autoFocus
                />
                <input
                  type="text"
                  placeholder="Type (ex: Prêt)"
                  className="rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddLiability()}
                />
              </div>
              <input
                type="number"
                placeholder="Montant initial ($)"
                className="w-full rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddLiability()}
              />
              <button
                onClick={handleAddLiability}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          )}

          {/* One row per item, separated by a rule; the edit form of an item takes its place */}
          <div className="divide-y divide-slate-100">
            {liabilities.map((l) => {
              const snapshots = [...l.snapshots].filter(s => s.date <= todayStr).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
              const currentAmount = snapshots[snapshots.length - 1]?.amount || 0;
              
              if (editingMetadataId === l.id) {
                return (
                  <div key={l.id} className="my-2 p-4 rounded-xl border-2 border-rose-200 bg-rose-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-600 uppercase">Modifier la dette</span>
                      <div className="flex gap-2">
                        <button onClick={() => setShowHistoryFor({id: l.id, type: 'liability'})} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-[10px] font-bold">
                          <HistoryIcon size={12} /> Historique
                        </button>
                        <button onClick={() => setEditingMetadataId(null)} className="text-slate-400 hover:text-slate-600">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        className="rounded-lg border-slate-200 text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateLiability(l.id)}
                        autoFocus
                        placeholder="Nom"
                      />
                      <input
                        type="text"
                        className="rounded-lg border-slate-200 text-sm"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateLiability(l.id)}
                        placeholder="Type"
                      />
                    </div>
                    <div className="grid grid-cols-1">
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full rounded-lg border-slate-200 text-sm pr-8 font-bold"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdateLiability(l.id)}
                          placeholder="Nouveau solde"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateLiability(l.id)}
                      className="w-full bg-rose-600 text-white py-1.5 rounded-lg font-bold text-sm hover:bg-rose-700"
                    >
                      Enregistrer
                    </button>
                  </div>
                );
              }

              return (
                <div key={l.id} className="group flex items-center gap-3 px-2 py-2 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800">{l.name}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 uppercase font-semibold">
                      <span>{l.type}</span>
                      {l.credits?.map((c, i) => (
                        <Link 
                          key={i} 
                          to="/credits" 
                          className="normal-case text-[10px] bg-rose-50 text-rose-600 px-1.5 rounded border border-rose-100 font-bold hover:bg-rose-100 flex items-center gap-0.5"
                        >
                          {c.name}
                          <ChevronRight size={8} />
                        </Link>
                      ))}
                    </div>
                  </div>
                  <span className="font-bold text-rose-600 tabular-nums whitespace-nowrap">
                    {money(currentAmount)}
                  </span>
                  <RowActions
                    onEdit={() => {
                      setEditingMetadataId(l.id);
                      setEditName(l.name);
                      setEditType(l.type);
                      setEditAmount(currentAmount.toString());
                    }}
                    onDelete={() => handleDeleteLiability(l.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Landmark className="text-emerald-500" size={22} />
              Mes Actifs
            </h2>
            <button 
              onClick={() => setIsAddingAsset(true)}
              aria-label="Ajouter un actif"
              className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {isAddingAsset && (
            <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700">Nouvel Actif</h3>
                <button onClick={() => setIsAddingAsset(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input
                  type="text"
                  placeholder="Nom"
                  className="rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAsset()}
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Type (ex: Actions)"
                    className="rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAsset()}
                  />
                  <input
                    type="text"
                    placeholder="Lieu (ex: CELI)"
                    className="rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={newItemLocation}
                    onChange={(e) => setNewItemLocation(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAsset()}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 size={18} className="text-slate-400" />
                    <select
                      className="flex-1 rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      value={newItemBankId}
                      onChange={(e) => setNewItemBankId(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddAsset()}
                    >
                      <option value="">Lier à une banque...</option>
                      {banks.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="number"
                    placeholder="Solde initial ($)"
                    className="rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAsset()}
                  />
                </div>
              </div>
              <button
                onClick={handleAddAsset}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {assets.map((a) => {
              const currentAmount = assetAmount(a);
              
              if (editingAssetMetadataId === a.id) {
                return (
                  <div key={a.id} className="my-2 p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-600 uppercase">Modifier l'actif</span>
                      <div className="flex gap-2">
                        <button onClick={() => setShowHistoryFor({id: a.id, type: 'asset'})} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-[10px] font-bold">
                          <HistoryIcon size={12} /> Historique
                        </button>
                        <button onClick={() => setEditingAssetMetadataId(null)} className="text-slate-400 hover:text-slate-600">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        className="rounded-lg border-slate-200 text-sm"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdateAsset(a.id)}
                        autoFocus
                        placeholder="Nom"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          className="rounded-lg border-slate-200 text-sm"
                          value={editType}
                          onChange={(e) => setEditType(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdateAsset(a.id)}
                          placeholder="Type"
                        />
                        <input
                          type="text"
                          className="rounded-lg border-slate-200 text-sm"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdateAsset(a.id)}
                          placeholder="Lieu"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          className="rounded-lg border-slate-200 text-sm"
                          value={editBankId}
                          onChange={(e) => setEditBankId(e.target.value)}
                        >
                          <option value="">Lier à une banque...</option>
                          {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          className="rounded-lg border-slate-200 text-sm"
                          value={editFixedValue}
                          onChange={(e) => setEditFixedValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdateAsset(a.id)}
                          placeholder="Valeur fixe"
                        />
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          className="w-full rounded-lg border-slate-200 text-sm pr-8 font-bold"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdateAsset(a.id)}
                          placeholder="Nouveau solde (Snapshot)"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateAsset(a.id)}
                      className="w-full bg-emerald-600 text-white py-1.5 rounded-lg font-bold text-sm hover:bg-emerald-700"
                    >
                      Enregistrer
                    </button>
                  </div>
                );
              }

              return (
                <div key={a.id} className="group flex items-center gap-3 px-2 py-2 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800">{a.name}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 font-semibold">
                      <span>{a.location} • {a.type}</span>
                      {a.type === "ETF" || a.type === "Action" ? (
                        <Link to="/investissements" className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline">
                          Voir titres <ChevronRight size={10} />
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Building2 size={12} />
                          <select 
                            aria-label="Banque"
                            className="text-[10px] border-none bg-slate-100 rounded px-1 py-0.5 focus:ring-0 text-slate-500"
                            value={a.bank_id || ""}
                            onChange={(e) => handleLinkBank(a.id, e.target.value)}
                          >
                            <option value="">Sans banque</option>
                            {banks.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        </span>
                      )}
                    </div>
                  </div>
                  {currentAmount < 0 && (
                    <span title={NEGATIVE_HINT}><TriangleAlert size={16} className="text-amber-500" /></span>
                  )}
                  <span className={`font-bold tabular-nums whitespace-nowrap ${currentAmount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {money(currentAmount)}
                  </span>
                  <RowActions
                    onEdit={() => {
                      setEditingAssetMetadataId(a.id);
                      setEditName(a.name);
                      setEditType(a.type);
                      setEditLocation(a.location || "");
                      setEditBankId(a.bank_id?.toString() || "");
                      setEditFixedValue(a.details?.value?.toString() || "");
                      setEditAmount(currentAmount.toString());
                    }}
                    onDelete={() => handleDeleteAsset(a.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryFor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <HistoryIcon className="text-blue-600" size={24} />
                <h3 className="font-bold text-xl">Historique des relevés</h3>
              </div>
              <button onClick={() => setShowHistoryFor(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {(showHistoryFor.type === 'asset' 
                  ? assets.find(a => a.id === showHistoryFor.id)?.snapshots 
                  : liabilities.find(l => l.id === showHistoryFor.id)?.snapshots
                )?.slice().reverse().map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 group">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-slate-500">{s.date}</span>
                      <span className="font-bold text-slate-900">{money(s.amount)}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteSnapshot(s.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 bg-slate-50 border-t border-slate-100">
              <button 
                onClick={() => setShowHistoryFor(null)}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
