import { useEffect, useState } from "react";
import { getCredits, createCredit, deleteCredit, updateCredit, getLiabilities, addSnapshot, deleteSnapshot } from "../api";
import { todayLocal } from "../date";
import { CreditCard, Plus, Trash2, Save, X, Link as LinkIcon, Info, Edit2, History as HistoryIcon } from "lucide-react";

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
}

interface Credit {
  id: number;
  name: string;
  type: string;
  limit?: number;
  interest_rate?: number;
  liability_id?: number;
  liability?: Liability;
}

export function Credits() {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newLiabilityId, setNewLiabilityId] = useState<string>("");
  const [newItemAmount, setNewItemAmount] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [editLimit, setEditLimit] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editLiabilityId, setEditLiabilityId] = useState<string>("");
  const [editAmount, setEditAmount] = useState("");

  const [showHistoryFor, setShowHistoryFor] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [creditsRes, liabilitiesRes] = await Promise.all([
        getCredits(),
        getLiabilities()
      ]);
      setCredits(creditsRes.data);
      setLiabilities(liabilitiesRes.data);
    } catch (err) {
      console.error("Failed to fetch credits:", err);
      setError("Erreur de chargement des crédits.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleAdd = async () => {
    if (!newName || !newType) return;
    try {
      const res = await createCredit({
        name: newName,
        type: newType,
        limit: parseFloat(newLimit) || null,
        interest_rate: parseFloat(newRate) || null,
        liability_id: newLiabilityId ? parseInt(newLiabilityId) : null,
      });
      
      if (newItemAmount && res.data.liability_id) {
        await addSnapshot({
          liability_id: res.data.liability_id,
          amount: parseFloat(newItemAmount),
          date: todayLocal(),
        });
      }

      setIsAdding(false);
      setNewName("");
      setNewType("");
      setNewLimit("");
      setNewRate("");
      setNewLiabilityId("");
      setNewItemAmount("");
      refreshData();
    } catch (err) {
      alert("Erreur lors de l'ajout du crédit");
    }
  };

  const handleUpdate = async (id: number) => {
    try {
      const targetLiabilityId = editLiabilityId ? parseInt(editLiabilityId) : null;
      
      await updateCredit(id, {
        name: editName,
        type: editType,
        limit: parseFloat(editLimit) || null,
        interest_rate: parseFloat(editRate) || null,
        liability_id: targetLiabilityId,
      });

      if (editAmount !== "" && targetLiabilityId) {
        await addSnapshot({
          liability_id: targetLiabilityId,
          amount: parseFloat(editAmount),
          date: todayStr,
        });
      }

      setEditingId(null);
      refreshData();
    } catch (err) {
      alert("Erreur lors de la mise à jour");
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

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer ce crédit ?")) return;
    try {
      await deleteCredit(id);
      refreshData();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const todayStr = todayLocal();

  const totalBalance = credits.reduce((sum, c) => {
    const snapshots = c.liability?.snapshots || [];
    const filtered = snapshots.filter(s => s.date <= todayStr);
    const sorted = [...filtered].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
    const amount = sorted[sorted.length - 1]?.amount || 0;
    return sum + amount;
  }, 0);

  const totalLimit = credits.reduce((sum, c) => sum + (c.limit || 0), 0);

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
          <div className="bg-rose-600 p-2 rounded-lg text-white shadow-lg">
            <CreditCard size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestion des Crédits</h1>
        </div>
        <button
          onClick={() => {
            setIsAdding(true);
            setNewName("");
            setNewType("");
            setNewLimit("");
            setNewRate("");
            setNewLiabilityId("");
            setNewItemAmount("");
          }}
          className="flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} />
          <span className="font-semibold">Nouveau Crédit</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-rose-600 mb-2">
            <CreditCard size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Dette de Crédit Totale</span>
          </div>
          <div className="text-3xl font-extrabold">{totalBalance.toLocaleString()} $</div>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-700 text-white">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Info size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Capacité de Crédit Totale</span>
          </div>
          <div className="text-3xl font-extrabold">{totalLimit.toLocaleString()} $</div>
        </div>
      </div>

      {isAdding && (
        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700">Nouveau Crédit / Prêt</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Nom</label>
              <input
                type="text"
                className="w-full rounded-lg border-slate-200 focus:ring-rose-500"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
                placeholder="ex: Visa"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Type</label>
              <input
                type="text"
                className="w-full rounded-lg border-slate-200 focus:ring-rose-500"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="ex: Carte de crédit"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Limite ($)</label>
              <input
                type="number"
                className="w-full rounded-lg border-slate-200 focus:ring-rose-500"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Taux d'intérêt (%)</label>
              <input
                type="number"
                className="w-full rounded-lg border-slate-200 focus:ring-rose-500"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Lien avec une Dette (Actifs/Passifs)</label>
              <select
                className="w-full rounded-lg border-slate-200 focus:ring-rose-500"
                value={newLiabilityId}
                onChange={(e) => setNewLiabilityId(e.target.value)}
              >
                <option value="">Aucun lien</option>
                {liabilities.map(l => (
                  <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                ))}
              </select>
            </div>
            {newLiabilityId && (
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1">Montant initial ($)</label>
                <input
                  type="number"
                  className="w-full rounded-lg border-slate-200 focus:ring-rose-500"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
          <button
            onClick={handleAdd}
            className="w-full mt-6 bg-rose-600 text-white py-2 rounded-lg font-bold hover:bg-rose-700 transition-colors"
          >
            Enregistrer
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {credits.map((credit) => {
          const snapshots = credit.liability?.snapshots || [];
          const filteredSnapshots = snapshots.filter(s => s.date <= todayStr);
          const sortedSnapshots = [...filteredSnapshots].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id - b.id);
          const currentLiabilityAmount = sortedSnapshots[sortedSnapshots.length - 1]?.amount || 0;
          const utilization = credit.limit ? (currentLiabilityAmount / credit.limit) * 100 : 0;
          const isEditing = editingId === credit.id;

          if (isEditing) {
            return (
              <div key={credit.id} className="bg-white p-6 rounded-2xl shadow-md border-2 border-rose-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-700">Modifier le crédit</h3>
                  <div className="flex gap-2">
                    {credit.liability_id && (
                      <button onClick={() => setShowHistoryFor(credit.liability_id!)} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-[10px] font-bold">
                        <HistoryIcon size={12} /> Historique
                      </button>
                    )}
                    <button onClick={() => setEditingId(null)} className="text-slate-400">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nom</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-slate-200 text-sm"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(credit.id)}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border-slate-200 text-sm"
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(credit.id)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Limite ($)</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border-slate-200 text-sm"
                        value={editLimit}
                        onChange={(e) => setEditLimit(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(credit.id)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Taux %</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border-slate-200 text-sm"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(credit.id)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Dette liée</label>
                    <select
                      className="w-full rounded-lg border-slate-200 text-sm"
                      value={editLiabilityId}
                      onChange={(e) => setEditLiabilityId(e.target.value)}
                    >
                      <option value="">Aucun lien</option>
                      {liabilities.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  {editLiabilityId && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Solde actuel ($)</label>
                      <input
                        type="number"
                        className="w-full rounded-lg border-slate-200 text-sm font-bold"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleUpdate(credit.id)}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => handleUpdate(credit.id)}
                    className="w-full bg-rose-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
                  >
                    <Save size={18} /> Enregistrer
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={credit.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold text-lg text-slate-800">{credit.name}</div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{credit.type}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingId(credit.id);
                      setEditName(credit.name);
                      setEditType(credit.type);
                      setEditLimit(credit.limit?.toString() || "");
                      setEditRate(credit.interest_rate?.toString() || "");
                      setEditLiabilityId(credit.liability_id?.toString() || "");
                      setEditAmount(currentLiabilityAmount.toString());
                    }}
                    className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(credit.id)}
                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase">Solde actuel</div>
                    <div className="text-2xl font-black text-slate-900">
                      {currentLiabilityAmount.toLocaleString()} $
                    </div>
                  </div>
                  {credit.limit && (
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-bold uppercase">Limite</div>
                      <div className="text-lg font-bold text-slate-600">
                        {credit.limit.toLocaleString()} $
                      </div>
                    </div>
                  )}
                </div>

                {credit.limit && (
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-slate-400">Utilisation</span>
                      <span className={utilization > 80 ? "text-rose-600" : "text-slate-600"}>
                        {utilization.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${utilization > 80 ? 'bg-rose-500' : 'bg-rose-400'}`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-50 flex items-center gap-4">
                  {credit.interest_rate && (
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span className="text-xs font-bold">{credit.interest_rate}% Intérêt</span>
                    </div>
                  )}
                  {credit.liability && (
                    <div className="flex items-center gap-1.5 text-blue-600">
                      <LinkIcon size={14} />
                      <span className="text-xs font-bold">Lié à: {credit.liability.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {credits.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <CreditCard size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Aucun crédit enregistré</p>
          <button
            onClick={() => setIsAdding(true)}
            className="mt-4 text-rose-600 font-bold hover:underline"
          >
            Ajouter votre premier crédit
          </button>
        </div>
      )}

      {/* History Modal */}
      {showHistoryFor && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <HistoryIcon className="text-blue-600" size={24} />
                <h3 className="font-bold text-xl">Historique du crédit</h3>
              </div>
              <button onClick={() => setShowHistoryFor(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {liabilities.find(l => l.id === showHistoryFor)?.snapshots?.slice().reverse().map(s => (
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
