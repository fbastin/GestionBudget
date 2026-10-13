import React, { useEffect, useState } from "react";
import { getDeposits, createDeposit, updateDeposit, deleteDeposit, getBanks, getAssets } from "../api";
import { todayLocal } from "../date";
import type { Asset, Bank, Deposit } from "../types";
import { BanknoteArrowDown, Plus, Trash2, Calendar, Tag, Wallet, Loader2, AlertCircle, Pencil, X, ArrowRightLeft } from "lucide-react";
import { money } from "../format";

// Today's date when the form is emptied, not when the page was loaded
const emptyForm = () => ({ date: todayLocal(), description: "", amount: "", account: "", source: "" });

/** "bank:3" or "asset:12", the value of an account in the selects, from the ids of a deposit. */
function accountValue(bankId: number | null, assetId: number | null) {
  if (assetId) return `asset:${assetId}`;
  if (bankId) return `bank:${bankId}`;
  return "";
}

/** Ids sent to the API for a select value: an account also gives its bank. */
function accountIds(value: string, assets: Asset[]): { bank_id: number | null; asset_id: number | null } {
  const [kind, id] = value.split(":");
  if (kind === "bank") return { bank_id: parseInt(id), asset_id: null };
  if (kind === "asset") {
    const asset_id = parseInt(id);
    return { bank_id: assets.find((a) => a.id === asset_id)?.bank_id ?? null, asset_id };
  }
  return { bank_id: null, asset_id: null };
}

/** Options of the account selects: the accounts of each bank, or the bank itself when it has none. */
function AccountOptions({ banks, assets }: { banks: Bank[]; assets: Asset[] }) {
  return (
    <>
      {banks.map((b) => {
        const bankAssets = assets.filter((a) => a.bank_id === b.id);
        if (bankAssets.length === 0) {
          return <option key={`bank-${b.id}`} value={`bank:${b.id}`}>{b.name}</option>;
        }
        return (
          <optgroup key={`bank-group-${b.id}`} label={b.name}>
            {bankAssets.map((a) => (
              <option key={`asset-${a.id}`} value={`asset:${a.id}`}>{a.name}</option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

export function Entrees() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // State only changes in the promise callbacks, once the requests are done: the initial load can run in an effect
  const loadData = () =>
    Promise.all([getDeposits(), getBanks(), getAssets()])
      .then(([depositsRes, banksRes, assetsRes]) => {
        setDeposits(depositsRes.data);
        setBanks(banksRes.data);
        setAssets(assetsRes.data);
        setError(null);
      })
      .catch((err) => {
        setError("Erreur lors du chargement des données.");
        console.error(err);
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // saving: ignore a second click while the first one is being saved (it would create a duplicate)
    if (saving || !form.description || !form.amount || !form.account) return;
    setSaving(true);
    try {
      const target = accountIds(form.account, assets);
      const source = accountIds(form.source, assets);
      const payload = {
        date: form.date,
        description: form.description,
        amount: parseFloat(form.amount),
        ...target,
        source_bank_id: source.bank_id,
        source_asset_id: source.asset_id,
      };
      if (editingId) await updateDeposit(editingId, payload);
      else await createDeposit(payload);
      resetForm();
      setLoading(true);
      await loadData();
    } catch {
      alert("Erreur lors de l'enregistrement de l'entrée.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (deposit: Deposit) => {
    setEditingId(deposit.id);
    setForm({
      date: deposit.date,
      description: deposit.description,
      amount: deposit.amount.toString(),
      account: accountValue(deposit.bank_id, deposit.asset_id),
      source: accountValue(deposit.source_bank_id, deposit.source_asset_id),
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette entrée ? Le solde du compte qui l'a reçue redescend d'autant.")) return;
    try {
      await deleteDeposit(id);
      setLoading(true);
      await loadData();
    } catch {
      alert("Erreur lors de la suppression.");
    }
  };

  const accountName = (bankId: number | null, assetId: number | null) =>
    assetId ? assets.find((a) => a.id === assetId)?.name : bankId ? banks.find((b) => b.id === bankId)?.name : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const field = "w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  return (
    <div className="p-4 md:p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Entrées</h1>
          <p className="text-slate-500 mt-1">Paies, virements reçus : l'argent qui arrive sur vos comptes</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1">
          {/* Stays in view while the history scrolls; scrolls itself if taller than the screen */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editingId ? <Pencil className="text-orange-500" size={20} /> : <BanknoteArrowDown className="text-emerald-600" size={20} />}
                {editingId ? "Modifier l'entrée" : "Nouvelle entrée"}
              </div>
              {editingId && (
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              )}
            </h2>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" required placeholder="ex: Paie, virement d'épargne..." value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} className={field} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Montant</label>
                <div className="relative">
                  <BanknoteArrowDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="number" step="0.01" min="0" required placeholder="0.00" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} className={field} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reçu sur</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select required value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} className={`${field} appearance-none`}>
                    <option value="">Sélectionner un compte</option>
                    <AccountOptions banks={banks} assets={assets} />
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  Provenance (optionnel)
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Déduite de ce compte</span>
                </label>
                <div className="relative">
                  <ArrowRightLeft className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={`${field} appearance-none`}>
                    <option value="">Extérieur (paie, autre personne...)</option>
                    <AccountOptions banks={banks} assets={assets} />
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3 ${editingId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'} text-white rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {editingId ? <Pencil size={20} /> : <Plus size={20} />}
                {editingId ? "Enregistrer les modifications" : "Ajouter"}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Historique des entrées</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">De → Vers</th>
                    <th className="px-4 py-2.5 text-right">Montant</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {deposits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">Aucune entrée enregistrée</td>
                    </tr>
                  ) : (
                    deposits.map((deposit) => {
                      const source = accountName(deposit.source_bank_id, deposit.source_asset_id);
                      return (
                        <tr key={deposit.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-4 py-2.5 text-slate-600 text-sm">{deposit.date}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-900">{deposit.description}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {source ? (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">{source}</span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Extérieur</span>
                              )}
                              <span className="text-slate-400">→</span>
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                {accountName(deposit.bank_id, deposit.asset_id)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-bold text-emerald-600">+{money(deposit.amount)}</span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => handleEdit(deposit)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                <Pencil size={18} />
                              </button>
                              <button onClick={() => handleDelete(deposit.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
