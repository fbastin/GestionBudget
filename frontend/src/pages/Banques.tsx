import { useEffect, useState } from "react";
import { getBanks, createBank, deleteBank, updateBank } from "../api";
import { Building2, Plus, Trash2, Save, X, Landmark } from "lucide-react";

interface Bank {
  id: number;
  name: string;
  balance: number;
}

export function Banques() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBalance, setNewBalance] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBalance, setEditBalance] = useState("");

  const refreshBanks = () => {
    getBanks().then((res) => setBanks(res.data));
  };

  useEffect(() => {
    refreshBanks();
  }, []);

  const handleAdd = async () => {
    if (!newName) return;
    try {
      await createBank({ name: newName, balance: parseFloat(newBalance) || 0 });
      setIsAdding(false);
      setNewName("");
      setNewBalance("");
      refreshBanks();
    } catch (err) {
      alert("Erreur lors de l'ajout de la banque");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Supprimer cette banque ?")) return;
    try {
      await deleteBank(id);
      refreshBanks();
    } catch (err) {
      alert("Erreur lors de la suppression");
    }
  };

  const handleUpdateBalance = async (id: number) => {
    try {
      await updateBank(id, { balance: parseFloat(editBalance) });
      setEditingId(null);
      refreshBanks();
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const totalBalance = banks.reduce((sum, bank) => sum + bank.balance, 0);

  return (
    <div className="p-4 md:p-8 font-sans text-slate-900">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg">
            <Building2 size={24} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gestion des Banques</h1>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} />
          <span className="font-semibold">Ajouter une Banque</span>
        </button>
      </header>

      <div className="mb-8">
        <div className="bg-indigo-600 p-6 rounded-2xl shadow-lg border border-indigo-500 text-white inline-block min-w-[300px]">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <Landmark size={18} />
            <span className="text-sm font-bold uppercase tracking-wider">Solde Total Bancaire</span>
          </div>
          <div className="text-3xl font-extrabold">{totalBalance.toLocaleString()} $</div>
        </div>
      </div>

      {isAdding && (
        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-700">Nouvelle Banque</h3>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1">Nom de l'institution</label>
              <input
                type="text"
                className="w-full rounded-lg border-slate-200 focus:ring-indigo-500 focus:border-indigo-500"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banks.map((bank) => (
          <div key={bank.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold text-lg text-slate-800">{bank.name}</div>
              <button
                onClick={() => handleDelete(bank.id)}
                className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              {editingId === bank.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="number"
                    className="flex-1 rounded-lg border-indigo-200 focus:ring-indigo-500 font-bold text-right"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdateBalance(bank.id)}
                    className="bg-indigo-600 text-white p-2 rounded-lg"
                  >
                    <Save size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-slate-900">
                    {bank.balance.toLocaleString()} $
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(bank.id);
                      setEditBalance(bank.balance.toString());
                    }}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Modifier
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {banks.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
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
