import { useEffect, useState } from "react";
import { 
  getContributions, 
  createContribution, 
  deleteContribution, 
  updateContribution, 
  getAssets, 
  getBanks, 
  addSnapshot, 
  updateAsset, 
  deleteSnapshot 
} from "../api";
import { 
  Landmark, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  TrendingUp, 
  PieChart, 
  Building2, 
  Edit2, 
  History as HistoryIcon 
} from "lucide-react";

interface Snapshot {
  id: number;
  date: string;
  amount: number;
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

interface Contribution {
  id: number;
  year: number;
  type: string;
  amount: number;
  institution?: string;
}

export function RegisteredAccount({ type }: { type: "CELI" | "REER" }) {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newAmount, setNewAmount] = useState("");
  const [newInstitution, setNewInstitution] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editYear, setEditYear] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editInstitution, setEditInstitution] = useState("");

  const [editingMetadataId, setEditingMetadataId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBankId, setEditBankId] = useState("");
  const [editFixedValue, setEditFixedValue] = useState("");
  const [editAssetAmount, setEditAssetAmount] = useState("");

  const [showHistoryFor, setShowHistoryFor] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [contRes, assetsRes, banksRes] = await Promise.all([
        getContributions(),
        getAssets(),
        getBanks()
      ]);
      setContributions(contRes.data.filter((c: Contribution) => c.type === type));
      setAssets(assetsRes.data.filter((a: Asset) => 
        (a.location && a.location.toUpperCase().includes(type)) || 
        a.name.toUpperCase().includes(type)
      ));
      setBanks(banksRes.data);
    } catch (err) {
      console.error(`Failed to fetch ${type} data:`, err);
      setError(`Erreur de chargement des données ${type}.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [type]);

  const handleUpdateAsset = async (id: number) => {
    try {
      await updateAsset(id, {
        name: editName,
        type: editType,
        location: editLocation,
        bank_id: editBankId === "" ? null : parseInt(editBankId),
        details: { value: editFixedValue === "" ? null : parseFloat(editFixedValue) }
      });
      if (editAssetAmount !== "") {
        await addSnapshot({
          asset_id: id,
          amount: parseFloat(editAssetAmount),
          date: todayStr,
        });
      }
      setEditingMetadataId(null);
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

  const handleLinkBank = async (assetId: number, bankId: string) => {
    try {
      await updateAsset(assetId, { bank_id: bankId === "" ? null : parseInt(bankId) });
      refreshData();
    } catch (err) {
      alert("Erreur lors de la liaison à la banque");
    }
  };

  const handleAdd = async () => {
    if (!newAmount) return;
    try {
      await createContribution({
        year: parseInt(newYear),
        type: type,
        amount: parseFloat(newAmount),
        institution: newInstitution
      });
      setIsAdding(false);
      setNewAmount("");
      setNewInstitution("");
      refreshData();
    } catch (err) {
      alert("Erreur lors de l'ajout");
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      await updateContribution(id, {
        year: parseInt(editYear),
        amount: parseFloat(editAmount),
        institution: editInstitution
      });
      setEditingId(null);
      refreshData();
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cette contribution ?")) return;
    try {
      await deleteContribution(id);
      refreshData();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const totalValue = assets.reduce((sum, a) => {
    const snapshots = [...a.snapshots].filter(s => s.date <= todayStr).sort((x,y) => new Date(x.date).getTime() - new Date(y.date).getTime() || x.id - y.id);
    const lastSnapshot = snapshots[snapshots.length - 1]?.amount || a.details?.value || 0;
    return sum + lastSnapshot;
  }, 0);

  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);

  const colorConfig = {
    CELI: { 
      bg: 'bg-emerald-600', 
      hover: 'hover:bg-emerald-700', 
      text: 'text-emerald-600', 
      border: 'border-emerald-200', 
      bgLight: 'bg-emerald-50', 
      border500: 'border-emerald-500', 
      text500: 'text-emerald-500' 
    },
    REER: { 
      bg: 'bg-indigo-600', 
      hover: 'hover:bg-indigo-700', 
      text: 'text-indigo-600', 
      border: 'border-indigo-200', 
      bgLight: 'bg-indigo-50', 
      border500: 'border-indigo-500', 
      text500: 'text-indigo-500' 
    }
  };
  const theme = colorConfig[type];

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
          <div className={`${theme.bg} p-2 rounded-lg text-white shadow-lg`}>
            <Landmark size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestion du {type}</h1>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className={`flex items-center gap-2 ${theme.bg} text-white px-4 py-2 rounded-lg ${theme.hover} transition-all shadow-sm active:scale-95`}
        >
          <Plus size={18} />
          <span className="font-semibold">Nouvelle Contribution</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className={`flex items-center gap-2 ${theme.text} mb-2`}>
            <TrendingUp size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Valeur Actuelle</span>
          </div>
          <div className="text-3xl font-extrabold">{totalValue.toLocaleString()} $</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <PieChart size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Total Contributions</span>
          </div>
          <div className="text-3xl font-extrabold">{totalContributions.toLocaleString()} $</div>
        </div>
        <div className={`${theme.bg} p-6 rounded-2xl shadow-lg border ${theme.border500} text-white`}>
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <TrendingUp size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Gain/Perte Latent</span>
          </div>
          <div className="text-3xl font-extrabold">{(totalValue - totalContributions).toLocaleString()} $</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Assets List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Landmark className={`${theme.text500}`} size={24} />
            Comptes et Placements {type}
          </h2>
          <div className="space-y-3">
            {assets.length > 0 ? assets.map(a => {
              const snapshots = [...a.snapshots].filter(s => s.date <= todayStr).sort((x,y) => new Date(x.date).getTime() - new Date(y.date).getTime() || x.id - y.id);
              const currentAmount = snapshots[snapshots.length - 1]?.amount || a.details?.value || 0;

              if (editingMetadataId === a.id) {
                return (
                  <div key={a.id} className={`p-4 rounded-xl border-2 ${theme.border} ${theme.bgLight} space-y-3`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${theme.text} uppercase`}>Modifier l'actif</span>
                      <div className="flex gap-2">
                        <button onClick={() => setShowHistoryFor(a.id)} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-[10px] font-bold">
                          <HistoryIcon size={12} /> Historique
                        </button>
                        <button onClick={() => setEditingMetadataId(null)} className="text-slate-400">
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
                          value={editAssetAmount}
                          onChange={(e) => setEditAssetAmount(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleUpdateAsset(a.id)}
                          placeholder="Solde actuel"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUpdateAsset(a.id)}
                      className={`w-full ${theme.bg} text-white py-1.5 rounded-lg font-bold text-sm ${theme.hover}`}
                    >
                      Enregistrer
                    </button>
                  </div>
                );
              }

              return (
                <div key={a.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        setEditingMetadataId(a.id);
                        setEditName(a.name);
                        setEditType(a.type);
                        setEditLocation(a.location || "");
                        setEditBankId(a.bank_id?.toString() || "");
                        setEditFixedValue(a.details?.value?.toString() || "");
                        setEditAssetAmount(currentAmount.toString());
                      }}
                      className="p-1.5 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 size={16} />
                    </button>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">{a.name}</div>
                      <div className="text-xs text-slate-400 font-semibold mb-2">{a.location} • {a.type}</div>
                      
                      <div className="flex items-center gap-2">
                        <Building2 size={14} className="text-slate-400" />
                        <select 
                          className="text-xs border-none bg-slate-50 rounded p-1 focus:ring-0 text-slate-500"
                          value={a.bank_id || ""}
                          onChange={(e) => handleLinkBank(a.id, e.target.value)}
                        >
                          <option value="">Lier à une banque...</option>
                          {banks.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`font-bold ${theme.text} text-lg`}>
                      {currentAmount.toLocaleString()} $
                    </div>
                  </div>
                </div>
              );
            }) : (
              <p className="text-slate-400 text-sm italic">Aucun actif tagué "{type}" trouvé dans Actifs/Passifs.</p>
            )}
          </div>
        </div>

        {/* Contributions List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <HistoryIcon className="text-slate-500" size={24} />
            Historique des Contributions
          </h2>

          {isAdding && (
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700">Nouvelle entrée</h3>
                <button onClick={() => setIsAdding(false)} className="text-slate-400">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  className="rounded-lg border-slate-200 text-sm"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoFocus
                  placeholder="Année"
                />
                <input
                  type="text"
                  className="rounded-lg border-slate-200 text-sm col-span-2"
                  value={newInstitution}
                  onChange={(e) => setNewInstitution(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Institution"
                />
              </div>
              <input
                type="number"
                className="w-full rounded-lg border-slate-200 text-sm"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Montant ($)"
              />
              <button
                onClick={handleAdd}
                className={`w-full ${theme.bg} text-white py-2 rounded-lg font-bold`}
              >
                Ajouter
              </button>
            </div>
          )}

          <div className="space-y-3">
            {contributions.sort((a,b) => b.year - a.year).map(c => (
              <div key={c.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between group">
                {editingId === c.id ? (
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      className="rounded-lg border-slate-200 text-sm"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(c.id)}
                      autoFocus
                    />
                    <input
                      type="text"
                      className="rounded-lg border-slate-200 text-sm"
                      value={editInstitution}
                      onChange={(e) => setEditInstitution(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(c.id)}
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        className="rounded-lg border-slate-200 text-sm w-full"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(c.id)}
                      />
                      <button onClick={() => handleUpdate(c.id)} className={`p-2 ${theme.bg} text-white rounded-lg`}><Save size={16} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold text-slate-400 w-12">{c.year}</div>
                      <div>
                        <div className="font-bold text-slate-800">{c.institution || "Non spécifié"}</div>
                        <div className="text-xs text-slate-400 uppercase font-bold">Contribution</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-slate-900">{c.amount.toLocaleString()} $</div>
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingId(c.id);
                            setEditYear(c.year.toString());
                            setEditAmount(c.amount.toString());
                            setEditInstitution(c.institution || "");
                          }}
                          className="p-1.5 text-slate-300 hover:text-blue-600"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-300 hover:text-rose-600">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
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
                {assets.find(a => a.id === showHistoryFor)?.snapshots?.slice().reverse().map(s => (
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
