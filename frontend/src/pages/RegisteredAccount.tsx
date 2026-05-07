import { useEffect, useState } from "react";
import { getContributions, createContribution, deleteContribution, updateContribution, getAssets } from "../api";
import { Landmark, Plus, Trash2, Save, X, TrendingUp, History, PieChart } from "lucide-react";

interface Snapshot {
  date: string;
  amount: number;
}

interface Asset {
  id: number;
  name: string;
  type: string;
  location?: string;
  snapshots: Snapshot[];
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
  const [isAdding, setIsAdding] = useState(false);
  
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());
  const [newAmount, setNewAmount] = useState("");
  const [newInstitution, setNewInstitution] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editYear, setEditYear] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editInstitution, setEditInstitution] = useState("");

  const refreshData = async () => {
    const [contRes, assetsRes] = await Promise.all([
      getContributions(),
      getAssets()
    ]);
    setContributions(contRes.data.filter((c: Contribution) => c.type === type));
    // Filter assets that have "CELI" or "REER" in their location or name
    setAssets(assetsRes.data.filter((a: Asset) => 
      (a.location && a.location.toUpperCase().includes(type)) || 
      a.name.toUpperCase().includes(type)
    ));
  };

  useEffect(() => {
    refreshData();
  }, [type]);

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
    const lastSnapshot = a.snapshots?.[a.snapshots.length - 1]?.amount || 0;
    return sum + lastSnapshot;
  }, 0);

  const totalContributions = contributions.reduce((sum, c) => sum + c.amount, 0);

  const colorClass = type === "CELI" ? "emerald" : "indigo";

  return (
    <div className="p-4 md:p-8 font-sans text-slate-900">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`bg-${colorClass}-600 p-2 rounded-lg text-white shadow-lg`}>
            <Landmark size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestion du {type}</h1>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className={`flex items-center gap-2 bg-${colorClass}-600 text-white px-4 py-2 rounded-lg hover:bg-${colorClass}-700 transition-all shadow-sm active:scale-95`}
        >
          <Plus size={18} />
          <span className="font-semibold">Nouvelle Contribution</span>
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className={`flex items-center gap-2 text-${colorClass}-600 mb-2`}>
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
        <div className={`bg-${colorClass}-600 p-6 rounded-2xl shadow-lg border border-${colorClass}-500 text-white`}>
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
            <Landmark className={`text-${colorClass}-500`} size={24} />
            Comptes et Placements {type}
          </h2>
          <div className="space-y-3">
            {assets.length > 0 ? assets.map(a => (
              <div key={a.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{a.name}</div>
                  <div className="text-xs text-slate-400 font-semibold">{a.location} • {a.type}</div>
                </div>
                <div className={`font-bold text-${colorClass}-600 text-lg`}>
                  {(a.snapshots?.[a.snapshots.length - 1]?.amount || 0).toLocaleString()} $
                </div>
              </div>
            )) : (
              <p className="text-slate-400 text-sm italic">Aucun actif tagué "{type}" trouvé dans Actifs/Passifs.</p>
            )}
          </div>
        </div>

        {/* Contributions List */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <History className="text-slate-500" size={24} />
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
                  placeholder="Année"
                />
                <input
                  type="text"
                  className="rounded-lg border-slate-200 text-sm col-span-2"
                  value={newInstitution}
                  onChange={(e) => setNewInstitution(e.target.value)}
                  placeholder="Institution"
                />
              </div>
              <input
                type="number"
                className="w-full rounded-lg border-slate-200 text-sm"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="Montant ($)"
              />
              <button
                onClick={handleAdd}
                className={`w-full bg-${colorClass}-600 text-white py-2 rounded-lg font-bold`}
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
                    />
                    <input
                      type="text"
                      className="rounded-lg border-slate-200 text-sm"
                      value={editInstitution}
                      onChange={(e) => setEditInstitution(e.target.value)}
                    />
                    <div className="flex gap-1">
                      <input
                        type="number"
                        className="rounded-lg border-slate-200 text-sm w-full"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                      />
                      <button onClick={() => handleUpdate(c.id)} className={`p-2 bg-${colorClass}-600 text-white rounded-lg`}><Save size={16} /></button>
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
                          <Plus size={16} />
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
    </div>
  );
}
