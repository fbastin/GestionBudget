import { useEffect, useState } from "react";
import { getAssets, getInvestments, createInvestment, updateInvestment, deleteInvestment } from "../api";
import { TrendingUp, Plus, Trash2, Save, X, Building2, BarChart3, Wallet, Edit2 } from "lucide-react";

interface Investment {
  id: number;
  symbol: string;
  quantity: number;
  average_cost: number;
  current_price?: number;
  asset_id: number;
}

interface Asset {
  id: number;
  name: string;
  type: string;
  location?: string;
  investments: Investment[];
  details?: any;
}

export function Investissements() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newSymbol, setNewSymbol] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newAvgCost, setNewAvgCost] = useState("");
  const [newAssetId, setNewAssetId] = useState("");
  const [newCurrentPrice, setNewCurrentPrice] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editSymbol, setEditSymbol] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editAvgCost, setEditAvgCost] = useState("");
  const [editAssetId, setEditAssetId] = useState("");
  const [editCurrentPrice, setEditCurrentPrice] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [assetsRes, invRes] = await Promise.all([
        getAssets(),
        getInvestments()
      ]);
      // Filter assets that are likely to hold investments
      const investmentAssets = assetsRes.data.filter((a: Asset) => 
        ["CELI", "REER", "Bourse", "Investissement"].some(type => 
          a.type.toUpperCase().includes(type.toUpperCase()) || 
          (a.location && a.location.toUpperCase().includes(type.toUpperCase())) ||
          a.name.toUpperCase().includes(type.toUpperCase())
        )
      );
      setAssets(investmentAssets);
      setInvestments(invRes.data);
    } catch (err) {
      console.error("Failed to fetch investments:", err);
      setError("Erreur de chargement des investissements.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleAdd = async () => {
    if (!newSymbol || !newQuantity || !newAvgCost || !newAssetId) {
      alert("Veuillez remplir tous les champs obligatoires (Ticker, Quantité, Coût Moyen, Compte)");
      return;
    }
    try {
      await createInvestment({
        symbol: newSymbol.toUpperCase(),
        quantity: parseFloat(newQuantity),
        average_cost: parseFloat(newAvgCost),
        asset_id: parseInt(newAssetId),
        current_price: newCurrentPrice === "" ? null : parseFloat(newCurrentPrice)
      });
      setIsAdding(false);
      setNewSymbol("");
      setNewQuantity("");
      setNewAvgCost("");
      setNewAssetId("");
      setNewCurrentPrice("");
      refreshData();
    } catch (err) {
      alert("Erreur lors de l'ajout");
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await updateInvestment(id, {
        symbol: editSymbol.toUpperCase(),
        quantity: parseFloat(editQuantity),
        average_cost: parseFloat(editAvgCost),
        asset_id: parseInt(editAssetId),
        current_price: editCurrentPrice === "" ? null : parseFloat(editCurrentPrice)
      });
      setEditingId(null);
      refreshData();
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cet investissement ?")) return;
    try {
      await deleteInvestment(id);
      refreshData();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const totalInvested = investments.reduce((sum, i) => sum + (i.quantity * i.average_cost), 0);
  const totalMarketValue = investments.reduce((sum, i) => sum + (i.quantity * (i.current_price || i.average_cost)), 0);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Chargement...</div>;

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

  return (
    <div className="p-4 md:p-8 font-sans text-slate-900">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg">
            <BarChart3 size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Suivi des Investissements</h1>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} />
          <span className="font-semibold">Ajouter un Titre</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Wallet size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Total Investi</span>
          </div>
          <div className="text-3xl font-extrabold">{totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <TrendingUp size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Valeur Marché</span>
          </div>
          <div className="text-3xl font-extrabold">{totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</div>
        </div>
        <div className={`p-6 rounded-2xl shadow-lg border text-white ${totalMarketValue >= totalInvested ? 'bg-emerald-600 border-emerald-500' : 'bg-rose-600 border-rose-500'}`}>
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <BarChart3 size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Gain/Perte Total</span>
          </div>
          <div className="text-3xl font-extrabold">{(totalMarketValue - totalInvested).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</div>
          <div className="text-sm opacity-80 font-bold">
            {totalInvested > 0 ? ((totalMarketValue / totalInvested - 1) * 100).toFixed(2) : 0}%
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="mb-8 p-6 bg-white rounded-2xl border-2 border-blue-100 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">Nouvel Investissement</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Ticker</label>
              <input
                type="text"
                className="w-full rounded-xl border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
                placeholder="Ex: VFV.TO"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Quantité</label>
              <input
                type="number"
                step="0.0001"
                className="w-full rounded-xl border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Coût Moyen ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-xl border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={newAvgCost}
                onChange={(e) => setNewAvgCost(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Prix Marché ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-xl border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={newCurrentPrice}
                onChange={(e) => setNewCurrentPrice(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Optionnel"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Compte</label>
              <select
                className="w-full rounded-xl border-slate-200 focus:ring-blue-500 focus:border-blue-500 text-sm"
                value={newAssetId}
                onChange={(e) => setNewAssetId(e.target.value)}
              >
                <option value="">Choisir un compte...</option>
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.location})</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-[0.98]"
          >
            Enregistrer le titre
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ticker</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Compte</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Quantité</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Prix Moyen</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Prix Marché</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Valeur</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Gain/Perte</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investments.map(i => {
                const asset = assets.find(a => a.id === i.asset_id);
                const marketPrice = i.current_price || i.average_cost;
                const costValue = i.quantity * i.average_cost;
                const marketValue = i.quantity * marketPrice;
                const gainLoss = marketValue - costValue;
                const gainLossPct = costValue > 0 ? (gainLoss / costValue) * 100 : 0;

                return (
                  <tr key={i.id} className="group hover:bg-slate-50/50 transition-colors">
                    {editingId === i.id ? (
                      <td colSpan={8} className="p-4">
                         <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Ticker</label>
                              <input type="text" className="w-full rounded-lg border-slate-200 text-sm" value={editSymbol} onChange={e => setEditSymbol(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUpdate(i.id)} autoFocus />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Quantité</label>
                              <input type="number" step="0.0001" className="w-full rounded-lg border-slate-200 text-sm" value={editQuantity} onChange={e => setEditQuantity(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUpdate(i.id)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Coût Moyen</label>
                              <input type="number" step="0.01" className="w-full rounded-lg border-slate-200 text-sm" value={editAvgCost} onChange={e => setEditAvgCost(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUpdate(i.id)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Prix Marché</label>
                              <input type="number" step="0.01" className="w-full rounded-lg border-slate-200 text-sm" value={editCurrentPrice} onChange={e => setEditCurrentPrice(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUpdate(i.id)} />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Compte</label>
                              <select className="w-full rounded-lg border-slate-200 text-sm" value={editAssetId} onChange={e => setEditAssetId(e.target.value)}>
                                {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleUpdate(i.id)} className="flex-1 bg-blue-600 text-white p-2 rounded-lg"><Save size={18} className="mx-auto"/></button>
                              <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-200 text-slate-600 p-2 rounded-lg"><X size={18} className="mx-auto"/></button>
                            </div>
                         </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{i.symbol}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                            <Building2 size={14} className="text-slate-400" />
                            {asset?.name || "Inconnu"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{i.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{i.average_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })} $</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {i.current_price ? `${i.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })} $` : "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-slate-900">{marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`font-bold ${gainLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {gainLoss >= 0 ? '+' : ''}{gainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                          </div>
                          <div className={`text-xs font-bold ${gainLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {gainLoss >= 0 ? '+' : ''}{gainLossPct.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                            <button 
                              onClick={() => {
                                setEditingId(i.id);
                                setEditSymbol(i.symbol);
                                setEditQuantity(i.quantity.toString());
                                setEditAvgCost(i.average_cost.toString());
                                setEditAssetId(i.asset_id.toString());
                                setEditCurrentPrice(i.current_price?.toString() || "");
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(i.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {investments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                    Aucun investissement enregistré. Cliquez sur "Ajouter un Titre" pour commencer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
