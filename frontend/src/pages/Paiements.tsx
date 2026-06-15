import React, { useEffect, useState } from "react";
import { 
  getPayments, 
  createPayment, 
  updatePayment,
  deletePayment, 
  getBanks, 
  getAssets,
  getCredits,
  getLiabilities
} from "../api";
import { 
  HandCoins, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  Wallet, 
  Loader2,
  AlertCircle,
  Pencil,
  X,
  CreditCard,
  TrendingDown
} from "lucide-react";

export function Paiements() {
  const [payments, setPayments] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [liabilities, setLiabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [newPayment, setNewPayment] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    amount: "",
    interest: "",
    bankId: "",
    assetId: "",
    creditId: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, banksRes, assetsRes, creditsRes, liabilitiesRes] = await Promise.all([
        getPayments(),
        getBanks(),
        getAssets(),
        getCredits(),
        getLiabilities()
      ]);
      setPayments(paymentsRes.data);
      setBanks(banksRes.data);
      setAssets(assetsRes.data);
      setCredits(creditsRes.data);
      setLiabilities(liabilitiesRes.data);
      setError(null);
    } catch (err) {
      setError("Erreur lors du chargement des données.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.description || !newPayment.amount || !newPayment.creditId) return;

    try {
      let credit_id = null;
      let liability_id = null;
      let bank_id = null;
      let asset_id = null;

      if (newPayment.creditId.startsWith("credit:")) {
        credit_id = parseInt(newPayment.creditId.split(":")[1]);
      } else if (newPayment.creditId.startsWith("liability:")) {
        liability_id = parseInt(newPayment.creditId.split(":")[1]);
      }

      if (newPayment.bankId.startsWith("bank:")) {
        bank_id = parseInt(newPayment.bankId.split(":")[1]);
      } else if (newPayment.bankId.startsWith("asset:")) {
        asset_id = parseInt(newPayment.bankId.split(":")[1]);
        // Also find the bank associated with this asset for model consistency
        const assetObj = assets.find(a => a.id === asset_id);
        if (assetObj && assetObj.bank_id) {
            bank_id = assetObj.bank_id;
        }
      }

      const payload = {
        date: newPayment.date,
        description: newPayment.description,
        amount: parseFloat(newPayment.amount),
        interest: parseFloat(newPayment.interest) || 0,
        bank_id,
        asset_id,
        credit_id,
        liability_id
      };

      if (editingId) {
        await updatePayment(editingId, payload);
      } else {
        await createPayment(payload);
      }
      setNewPayment({
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: "",
        interest: "",
        bankId: "",
        assetId: "",
        creditId: ""
      });
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'enregistrement du paiement.");
    }
  };

  const handleEdit = (payment: any) => {
    setEditingId(payment.id);
    let creditId = "";
    if (payment.credit_id) creditId = `credit:${payment.credit_id}`;
    else if (payment.liability_id) creditId = `liability:${payment.liability_id}`;

    let bankId = "";
    if (payment.asset_id) bankId = `asset:${payment.asset_id}`;
    else if (payment.bank_id) bankId = `bank:${payment.bank_id}`;

    setNewPayment({
      date: payment.date,
      description: payment.description,
      amount: payment.amount.toString(),
      interest: payment.interest?.toString() || "",
      bankId,
      assetId: payment.asset_id?.toString() || "",
      creditId
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewPayment({
      date: new Date().toISOString().split('T')[0],
      description: "",
      amount: "",
      interest: "",
      bankId: "",
      assetId: "",
      creditId: ""
    });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce paiement ?")) return;
    try {
      await deletePayment(id);
      fetchData();
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Paiements</h1>
          <p className="text-slate-500 mt-1">Gérez le remboursement de vos dettes</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
          <AlertCircle size={20} />
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulaire d'ajout/modification */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 sticky top-8">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editingId ? <Pencil className="text-orange-500" size={20} /> : <HandCoins className="text-blue-600" size={20} />}
                {editingId ? "Modifier Paiement" : "Nouveau Paiement"}
              </div>
              {editingId && (
                <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              )}
            </h2>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    required
                    value={newPayment.date}
                    onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    placeholder="ex: Paiement carte de crédit..."
                    value={newPayment.description}
                    onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Montant Total</label>
                <div className="relative">
                  <HandCoins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  Portion Intérêt (optionnel)
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Non déduite de la dette</span>
                </label>
                <div className="relative">
                  <TrendingDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newPayment.interest}
                    onChange={(e) => setNewPayment({ ...newPayment, interest: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payé de (Source)</label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    value={newPayment.bankId}
                    onChange={(e) => setNewPayment({ ...newPayment, bankId: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="">Sélectionner un compte (optionnel)</option>
                    {banks.map(b => {
                      const bankAssets = assets.filter(a => a.bank_id === b.id);
                      if (bankAssets.length === 0) {
                        return <option key={`bank-${b.id}`} value={`bank:${b.id}`}>{b.name}</option>;
                      }
                      return (
                        <optgroup key={`bank-group-${b.id}`} label={b.name}>
                          {bankAssets.map(a => (
                            <option key={`asset-${a.id}`} value={`asset:${a.id}`}>{a.name}</option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dette remboursée (Cible)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select
                    required
                    value={newPayment.creditId}
                    onChange={(e) => setNewPayment({ ...newPayment, creditId: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="">Sélectionner une dette</option>
                    <optgroup label="Comptes de Crédit">
                      {credits.map(c => (
                        <option key={`credit-${c.id}`} value={`credit:${c.id}`}>{c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Toutes les Dettes">
                      {liabilities.map(l => (
                        <option key={`liability-${l.id}`} value={`liability:${l.id}`}>{l.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className={`w-full py-3 ${editingId ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'} text-white rounded-xl font-bold transition-colors shadow-lg flex items-center justify-center gap-2 mt-4`}
              >
                {editingId ? <Pencil size={20} /> : <Plus size={20} />}
                {editingId ? "Enregistrer les modifications" : "Ajouter"}
              </button>
            </form>
          </div>
        </div>

        {/* Liste des paiements */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Historique des paiements</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">De → Vers</th>
                    <th className="px-6 py-4 text-right">Montant</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                        Aucun paiement enregistré
                      </td>
                    </tr>
                  ) : (
                    payments.map((payment) => {
                      let bankName = "";
                      if (payment.asset_id) {
                        bankName = assets.find(a => a.id === payment.asset_id)?.name || "";
                      } else if (payment.bank_id) {
                        bankName = banks.find(b => b.id === payment.bank_id)?.name || "";
                      }
                      
                      const creditName = payment.credit_id 
                        ? credits.find(c => c.id === payment.credit_id)?.name 
                        : liabilities.find(l => l.id === payment.liability_id)?.name;
                      
                      return (
                        <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 text-slate-600 text-sm">{payment.date}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{payment.description}</span>
                              {payment.interest > 0 && (
                                <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tight">
                                  dont {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(payment.interest)} d'intérêt
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {bankName ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                  {bankName}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs italic">Cash</span>
                              )}
                              <span className="text-slate-400">→</span>
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                {creditName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-bold text-blue-600">
                              {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(payment.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleEdit(payment)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(payment.id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
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
