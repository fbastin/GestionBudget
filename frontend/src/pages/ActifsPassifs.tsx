import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, getLiabilities, addSnapshot, exportCSV, getAssets, getHistory, createAsset, deleteAsset, createLiability, deleteLiability, getBanks, updateAsset, updateLiability, importCSV, deleteSnapshot } from "../api";
import { LayoutDashboard, Wallet, TrendingDown, Landmark, Download, Plus, Trash2, X, Building2, Upload, Edit2, ChevronRight, History as HistoryIcon } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  details?: any;
  snapshots: Snapshot[];
}

interface Bank {
  id: number;
  name: string;
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

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [dashRes, liabRes, assetRes, histRes, bankRes] = await Promise.all([
        getDashboard(),
        getLiabilities(),
        getAssets(),
        getHistory(),
        getBanks()
      ]);
      setDashboard(dashRes.data);
      setLiabilities(liabRes.data);
      setAssets(assetRes.data);
      setHistory(histRes.data);
      setBanks(bankRes.data);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setError(`Impossible de charger les données (${err.message || 'Erreur inconnue'}). Veuillez vérifier que le serveur est lancé sur le port 8000.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleUpdateLiability = async (id: number) => {
    try {
      await updateLiability(id, { name: editName, type: editType });
      if (editAmount !== "") {
        await addSnapshot({
          liability_id: id,
          amount: parseFloat(editAmount),
          date: new Date().toISOString().split("T")[0],
        });
      }
      setEditingMetadataId(null);
      refreshData();
    } catch (err) {
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
        details: { value: editFixedValue === "" ? null : parseFloat(editFixedValue) }
      });
      if (editAmount !== "") {
        await addSnapshot({
          asset_id: id,
          amount: parseFloat(editAmount),
          date: new Date().toISOString().split("T")[0],
        });
      }
      setEditingAssetMetadataId(null);
      refreshData();
    } catch (err) {
      alert("Erreur lors de la modification");
    }
  };

  const handleDeleteSnapshot = async (sid: number) => {
    if (!window.confirm("Supprimer ce relevé historique ?")) return;
    try {
      await deleteSnapshot(sid);
      refreshData();
    } catch (err) {
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
          date: new Date().toISOString().split("T")[0],
        });
      }
      setIsAddingLiability(false);
      setNewItemName("");
      setNewItemType("");
      setNewItemAmount("");
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
          date: new Date().toISOString().split("T")[0],
        });
      }
      setIsAddingAsset(false);
      setNewItemName("");
      setNewItemType("");
      setNewItemLocation("");
      setNewItemBankId("");
      setNewItemAmount("");
      refreshData();
    } catch (err) {
      alert("Erreur lors de l'ajout de l'actif");
    }
  };

  const handleLinkBank = async (assetId: number, bankId: string) => {
    try {
      await updateAsset(assetId, { bank_id: bankId === "" ? null : parseInt(bankId) });
      refreshData();
    } catch (err) {
      alert("Erreur lors de la liaison à la banque");
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

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importCSV(file);
      refreshData();
      alert("Importation réussie");
    } catch (err) {
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

          <div className="space-y-3">
            {liabilities.map((l) => {
              const snapshots = [...l.snapshots].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
              const currentAmount = snapshots[snapshots.length - 1]?.amount || 0;
              
              if (editingMetadataId === l.id) {
                return (
                  <div key={l.id} className="p-4 rounded-xl border-2 border-rose-200 bg-rose-50 space-y-3">
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
                <div key={l.id} className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleDeleteLiability(l.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingMetadataId(l.id);
                          setEditName(l.name);
                          setEditType(l.type);
                          setEditAmount(currentAmount.toString());
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{l.name}</div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">{l.type}</div>
                      {l.credits && l.credits.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {l.credits.map((c, i) => (
                            <Link 
                              key={i} 
                              to="/credits" 
                              className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 font-bold hover:bg-rose-100 flex items-center gap-0.5"
                            >
                              {c.name}
                              <ChevronRight size={8} />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-rose-600 text-lg">
                      {currentAmount.toLocaleString()} $
                    </span>
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

          <div className="space-y-3">
            {assets.map((a) => {
              const snapshots = [...a.snapshots].sort((x,y) => new Date(x.date).getTime() - new Date(y.date).getTime() || x.id - y.id);
              const currentAmount = snapshots[snapshots.length - 1]?.amount || a.details?.value || 0;
              
              if (editingAssetMetadataId === a.id) {
                return (
                  <div key={a.id} className="p-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 space-y-3">
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
                <div key={a.id} className="p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleDeleteAsset(a.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setEditingAssetMetadataId(a.id);
                          setEditName(a.name);
                          setEditType(a.type);
                          setEditLocation(a.location || "");
                          setEditBankId(a.bank_id?.toString() || "");
                          setEditFixedValue(a.details?.value?.toString() || "");
                          setEditAmount(currentAmount.toString());
                        }}
                        className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-md"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{a.name}</div>
                      <div className="text-xs text-slate-400 font-semibold mb-1">{a.location} • {a.type}</div>
                      <div className="flex items-center gap-2">
                        {a.type === "ETF" || a.type === "Action" ? (
                           <Link to="/investissements" className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline">
                             Voir titres <ChevronRight size={10} />
                           </Link>
                        ) : (
                          <>
                            <Building2 size={12} className="text-slate-400" />
                            <select 
                              className="text-[10px] border-none bg-slate-100 rounded px-1 py-0.5 focus:ring-0 text-slate-500"
                              value={a.bank_id || ""}
                              onChange={(e) => handleLinkBank(a.id, e.target.value)}
                            >
                              <option value="">Sans banque</option>
                              {banks.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-600 text-lg">
                      {currentAmount.toLocaleString()} $
                    </span>
                  </div>
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
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <HistoryIcon className="text-blue-600" size={24} />
                <h3 className="font-bold text-xl">Historique des relevés</h3>
              </div>
              <button onClick={() => setShowHistoryFor(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {(showHistoryFor.type === 'asset' 
                  ? assets.find(a => a.id === showHistoryFor.id)?.snapshots 
                  : liabilities.find(l => l.id === showHistoryFor.id)?.snapshots
                )?.slice().reverse().map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 group">
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-slate-500">{s.date}</span>
                      <span className="font-bold text-slate-900">{s.amount.toLocaleString()} $</span>
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
            <div className="p-6 bg-slate-50 border-t border-slate-100">
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
