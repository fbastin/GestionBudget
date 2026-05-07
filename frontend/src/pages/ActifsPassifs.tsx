import { useEffect, useState } from "react";
import { getDashboard, getLiabilities, addSnapshot, exportCSV, getAssets, getHistory, createAsset, deleteAsset, createLiability, deleteLiability } from "../api";
import { LayoutDashboard, Wallet, TrendingDown, Landmark, Save, Download, Plus, Trash2, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface DashboardData {
  total_assets: number;
  total_liabilities: number;
  net_worth: number;
}

interface Snapshot {
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
  details?: any;
  snapshots: Snapshot[];
}

interface HistoryItem {
  date: string;
  assets: number;
  liabilities: number;
  net_worth: number;
}

export function ActifsPassifs() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null);
  const [newAmount, setNewAmount] = useState<string>("");
  
  const [isAddingLiability, setIsAddingLiability] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemType, setNewItemType] = useState("");
  const [newItemLocation, setNewItemLocation] = useState("");

  const refreshData = () => {
    getDashboard().then((res) => setDashboard(res.data));
    getLiabilities().then((res) => setLiabilities(res.data));
    getAssets().then((res) => setAssets(res.data));
    getHistory().then((res) => setHistory(res.data));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleUpdateAmount = async (liabilityId: number) => {
    if (!newAmount) return;
    try {
      await addSnapshot({
        liability_id: liabilityId,
        amount: parseFloat(newAmount),
        date: new Date().toISOString().split("T")[0],
      });
      setEditingId(null);
      setNewAmount("");
      refreshData();
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleUpdateAssetAmount = async (assetId: number) => {
    if (!newAmount) return;
    try {
      await addSnapshot({
        asset_id: assetId,
        amount: parseFloat(newAmount),
        date: new Date().toISOString().split("T")[0],
      });
      setEditingAssetId(null);
      setNewAmount("");
      refreshData();
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleAddLiability = async () => {
    if (!newItemName || !newItemType) return;
    try {
      await createLiability({ name: newItemName, type: newItemType });
      setIsAddingLiability(false);
      setNewItemName("");
      setNewItemType("");
      refreshData();
    } catch (err) {
      alert("Erreur lors de l'ajout de la dette");
    }
  };

  const handleDeleteLiability = async (id: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette dette ?")) return;
    try {
      await deleteLiability(id);
      refreshData();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleAddAsset = async () => {
    if (!newItemName || !newItemType) return;
    try {
      await createAsset({ name: newItemName, type: newItemType, location: newItemLocation });
      setIsAddingAsset(false);
      setNewItemName("");
      setNewItemType("");
      setNewItemLocation("");
      refreshData();
    } catch (err) {
      alert("Erreur lors de l'ajout de l'actif");
    }
  };

  const handleDeleteAsset = async (id: number) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet actif ?")) return;
    try {
      await deleteAsset(id);
      refreshData();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  if (!dashboard) return <div className="p-8 text-center text-gray-500">Chargement des données...</div>;

  return (
    <div className="p-4 md:p-8 font-sans text-slate-900">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
          >
            <Download size={18} />
            <span className="font-semibold">Exporter CSV</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-emerald-600 mb-2">
            <Landmark size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Actifs Totaux</span>
          </div>
          <div className="text-3xl font-extrabold">{dashboard.total_assets.toLocaleString()} $</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <TrendingDown size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Passifs Totaux</span>
          </div>
          <div className="text-3xl font-extrabold">{dashboard.total_liabilities.toLocaleString()} $</div>
        </div>

        <div className="bg-blue-600 p-6 rounded-2xl shadow-lg border border-blue-500 text-white transform hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Wallet size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Valeur Nette</span>
          </div>
          <div className="text-3xl font-extrabold">{dashboard.net_worth.toLocaleString()} $</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
              Évolution de la Valeur Nette
            </h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#64748b', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#64748b', fontSize: 12}}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${Number(value).toLocaleString()} $`, 'Valeur Nette']}
                />
                <Line 
                  type="monotone" 
                  dataKey="net_worth" 
                  stroke="#2563eb" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-2 h-6 bg-rose-500 rounded-full"></span>
              Évolution des Passifs
            </h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#64748b', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#64748b', fontSize: 12}}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="liabilities" 
                  stroke="#f43f5e" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <TrendingDown className="text-rose-500" size={24} />
              Liste des Dettes
            </h2>
            <button 
              onClick={() => setIsAddingLiability(true)}
              className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {isAddingLiability && (
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
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
                />
                <input
                  type="text"
                  placeholder="Type (ex: Prêt)"
                  className="rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value)}
                />
              </div>
              <button
                onClick={handleAddLiability}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Ajouter
              </button>
            </div>
          )}

          <div className="space-y-3">
            {liabilities.map((l) => {
              const currentAmount = l.snapshots[l.snapshots.length - 1]?.amount || 0;
              return (
                <div key={l.id} className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleDeleteLiability(l.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div>
                      <div className="font-bold text-slate-800">{l.name}</div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">{l.type}</div>
                      {l.credits && l.credits.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {l.credits.map((c, i) => (
                            <span key={i} className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 font-bold">
                              {c.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {editingId === l.id ? (
                      <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-blue-200 shadow-sm">
                        <input
                          type="number"
                          className="border-none focus:ring-0 px-2 py-1 w-28 text-right font-bold"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateAmount(l.id)}
                          className="bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Save size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-rose-600 text-lg">
                          {currentAmount.toLocaleString()} $
                        </span>
                        <button
                          onClick={() => {
                            setEditingId(l.id);
                            setNewAmount(currentAmount.toString());
                          }}
                          className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Landmark className="text-emerald-500" size={24} />
              Mes Actifs
            </h2>
            <button 
              onClick={() => setIsAddingAsset(true)}
              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {isAddingAsset && (
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
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
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Type (ex: Actions)"
                    className="rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Lieu (ex: CELI)"
                    className="rounded-lg border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={newItemLocation}
                    onChange={(e) => setNewItemLocation(e.target.value)}
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

          <div className="space-y-3">
            {assets.map((a) => {
              const currentAmount = a.snapshots?.[a.snapshots.length - 1]?.amount || a.details?.value || 0;
              return (
                <div key={a.id} className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => handleDeleteAsset(a.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div>
                      <div className="font-bold text-slate-800">{a.name}</div>
                      <div className="text-xs text-slate-400 font-semibold">{a.location} • {a.type}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {editingAssetId === a.id ? (
                      <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-blue-200 shadow-sm">
                        <input
                          type="number"
                          className="border-none focus:ring-0 px-2 py-1 w-28 text-right font-bold"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdateAssetAmount(a.id)}
                          className="bg-blue-600 text-white p-1.5 rounded-md hover:bg-blue-700 transition-colors"
                        >
                          <Save size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-600 text-lg">
                          {currentAmount.toLocaleString()} $
                        </span>
                        <button
                          onClick={() => {
                            setEditingAssetId(a.id);
                            setNewAmount(currentAmount.toString());
                          }}
                          className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
