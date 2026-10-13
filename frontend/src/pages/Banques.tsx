import { useEffect, useState } from "react";
import { getBanks, createBank, deleteBank, updateBank, getAssets, errorMessage } from "../api";
import { Building2, Plus, Trash2, Save, X, Landmark, Wallet, Edit2 } from "lucide-react";
import { money } from "../format";

interface Snapshot {
  date: string;
  amount: number;
}

interface Asset {
  id: number;
  name: string;
  type: string;
  location?: string;
  bank_id?: number;
  snapshots: Snapshot[];
}

interface Bank {
  id: number;
  name: string;
  balance: number;
}

export function Banques() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBalance, setNewBalance] = useState("");
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editBalance, setEditBalance] = useState("");
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State only changes in the promise callbacks, once the requests are done: the initial load can run in an effect
  const loadData = () =>
    Promise.all([
      getBanks(),
      getAssets()
    ])
      .then(([banksRes, assetsRes]) => {
        setBanks(banksRes.data);
        setAssets(assetsRes.data);
      })
      .catch((err) => {
        console.error("Failed to fetch banks:", err);
        setError("Erreur de chargement des données bancaires.");
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

  const handleAdd = async () => {
    if (!newName) return;
    try {
      await createBank({ name: newName, balance: parseFloat(newBalance) || 0 });
      setIsAdding(false);
      setNewName("");
      setNewBalance("");
      refreshData();
    } catch {
      alert("Erreur lors de l'ajout de la banque");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cette banque ?")) return;
    try {
      await deleteBank(id);
      refreshData();
    } catch (err) {
      alert(errorMessage(err, "Erreur lors de la suppression"));
    }
  };

  const handleUpdateBank = async (id: number) => {
    try {
      await updateBank(id, { 
        name: editName,
        balance: parseFloat(editBalance) 
      });
      setEditingId(null);
      refreshData();
    } catch {
      alert("Erreur lors de la mise à jour");
    }
  };

  const getBankAssetsTotal = (bankId: number) => {
    return assets
      .filter(a => a.bank_id === bankId)
      .reduce((sum, a) => sum + (a.snapshots?.[a.snapshots.length - 1]?.amount || 0), 0);
  };

  const totalBalance = banks.reduce((sum, bank) => sum + bank.balance + getBankAssetsTotal(bank.id), 0);

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
    <div className="p-4 md:p-6 font-sans text-slate-900">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg">
            <Building2 size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestion des Banques</h1>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setNewName("");
            setNewBalance("");
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} />
          <span className="font-semibold">Ajouter une Banque</span>
        </button>
      </header>

      <div className="mb-5">
        <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg border border-indigo-500 text-white inline-block min-w-[300px]">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Landmark size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Solde Total Bancaire</span>
          </div>
          <div className="text-3xl font-extrabold">{money(totalBalance)}</div>
        </div>
      </div>

      {isAdding && (
        <div className="mb-5 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700">Nouvelle Banque</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Nom de l'institution</label>
              <input
                type="text"
                className="w-full rounded-lg border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
                placeholder="ex: Ma banque"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Solde initial</label>
              <input
                type="number"
                className="w-full rounded-lg border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="0.00"
              />
            </div>
            <button
              onClick={handleAdd}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
            >
              Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {banks.map((bank) => {
          const bankAssets = assets.filter(a => a.bank_id === bank.id);
          const assetsTotal = getBankAssetsTotal(bank.id);
          const institutionTotal = bank.balance + assetsTotal;
          const isEditing = editingId === bank.id;

          if (isEditing) {
            return (
              <div key={bank.id} className="bg-white p-5 rounded-2xl shadow-md border-2 border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-700">Modifier l'institution</h3>
                  <button onClick={() => setEditingId(null)} className="text-slate-400">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nom</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-slate-200 text-sm"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateBank(bank.id)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Solde Bancaire ($)</label>
                    <input
                      type="number"
                      className="w-full rounded-lg border-slate-200 text-sm font-bold"
                      value={editBalance}
                      onChange={(e) => setEditBalance(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdateBank(bank.id)}
                    />
                  </div>
                  <button
                    onClick={() => handleUpdateBank(bank.id)}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Enregistrer
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={bank.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-lg text-slate-800">{bank.name}</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingId(bank.id);
                      setEditName(bank.name);
                      setEditBalance(bank.balance.toString());
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    title="Modifier la banque"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(bank.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Supprimer la banque"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                  <div className="text-sm font-medium text-slate-500 flex items-center gap-1">
                    <Wallet size={14} /> Solde Bancaire
                  </div>
                  <span className="font-bold text-slate-700">{money(bank.balance)}</span>
                </div>

                {bankAssets.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Comptes liés (CELI/REER/Actifs)</div>
                    {bankAssets.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{a.name}</span>
                        <span className="font-semibold text-slate-800">{money(a.snapshots?.[a.snapshots.length - 1]?.amount || 0)}</span>
                      </div>
                    ))}
                    <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-50">
                      <span className="text-slate-400 italic">Sous-total actifs</span>
                      <span className="font-bold text-emerald-600">{money(assetsTotal)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Total Institution</span>
                    <span className="text-xl font-black text-indigo-600">{money(institutionTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {banks.length === 0 && !isAdding && (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Aucune banque enregistrée</p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-4 text-indigo-600 font-bold hover:underline"
          >
            Ajouter votre première banque
          </button>
        </div>
      )}
    </div>
  );
}
