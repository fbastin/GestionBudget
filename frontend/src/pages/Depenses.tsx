import React, { useEffect, useState } from "react";
import { 
  getExpenses, 
  createExpense, 
  updateExpense,
  deleteExpense, 
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getBanks, 
  getCredits,
  getLiabilities,
  exportExpensesCSV,
  importExpensesCSV
} from "../api";
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  Wallet, 
  Download, 
  Upload, 
  Loader2,
  AlertCircle,
  Pencil,
  X,
  CreditCard,
  TrendingDown
} from "lucide-react";

export function Depenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [credits, setCredits] = useState<any[]>([]);
  const [liabilities, setLiabilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    amount: "",
    interest: "",
    accountId: "", // format: "bank:ID" or "credit:ID" or "liability:ID"
    isPayment: false,
    bankId: "",
    creditId: "",
    liabilityId: ""
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [expensesRes, paymentsRes, banksRes, creditsRes, liabilitiesRes] = await Promise.all([
        getExpenses(),
        getPayments(),
        getBanks(),
        getCredits(),
        getLiabilities()
      ]);
      
      const combined = [
        ...expensesRes.data.map((e: any) => ({ ...e, type: 'expense' })),
        ...paymentsRes.data.map((p: any) => ({ ...p, type: 'payment' }))
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setExpenses(combined);
      setBanks(banksRes.data);
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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;

    try {
      if (newExpense.isPayment) {
        let credit_id = null;
        let liability_id = null;

        if (newExpense.creditId.startsWith("credit:")) {
          credit_id = parseInt(newExpense.creditId.split(":")[1]);
        } else if (newExpense.creditId.startsWith("liability:")) {
          liability_id = parseInt(newExpense.creditId.split(":")[1]);
        }

        const payload = {
          date: newExpense.date,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          interest: parseFloat(newExpense.interest) || 0,
          bank_id: newExpense.bankId ? parseInt(newExpense.bankId) : null,
          credit_id,
          liability_id
        };

        if (editingId && isEditingPayment) {
          await updatePayment(editingId, payload);
        } else {
          await createPayment(payload);
        }
      } else {
        let bank_id = null;
        let credit_id = null;
        let liability_id = null;

        if (newExpense.accountId.startsWith("bank:")) {
          bank_id = parseInt(newExpense.accountId.split(":")[1]);
        } else if (newExpense.accountId.startsWith("credit:")) {
          credit_id = parseInt(newExpense.accountId.split(":")[1]);
        } else if (newExpense.accountId.startsWith("liability:")) {
          liability_id = parseInt(newExpense.accountId.split(":")[1]);
        }

        if (editingId && !isEditingPayment) {
          await updateExpense(editingId, {
            date: newExpense.date,
            description: newExpense.description,
            amount: parseFloat(newExpense.amount),
            bank_id,
            credit_id,
            liability_id
          });
        } else {
          await createExpense({
            date: newExpense.date,
            description: newExpense.description,
            amount: parseFloat(newExpense.amount),
            bank_id,
            credit_id,
            liability_id
          });
        }
      }

      setNewExpense({
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: "",
        interest: "",
        accountId: "",
        isPayment: false,
        bankId: "",
        creditId: "",
        liabilityId: ""
      });
      setEditingId(null);
      setIsEditingPayment(false);
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'enregistrement.");
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setIsEditingPayment(item.type === 'payment');
    
    if (item.type === 'payment') {
      let creditId = "";
      if (item.credit_id) creditId = `credit:${item.credit_id}`;
      else if (item.liability_id) creditId = `liability:${item.liability_id}`;

      setNewExpense({
        date: item.date,
        description: item.description,
        amount: item.amount.toString(),
        interest: item.interest?.toString() || "",
        accountId: "",
        isPayment: true,
        bankId: item.bank_id?.toString() || "",
        creditId,
        liabilityId: ""
      });
    } else {
      let accountId = "";
      if (item.bank_id) accountId = `bank:${item.bank_id}`;
      else if (item.credit_id) accountId = `credit:${item.credit_id}`;
      else if (item.liability_id) accountId = `liability:${item.liability_id}`;
      
      setNewExpense({
        date: item.date,
        description: item.description,
        amount: item.amount.toString(),
        interest: "",
        accountId,
        isPayment: false,
        bankId: "",
        creditId: "",
        liabilityId: ""
      });
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsEditingPayment(false);
    setNewExpense({
      date: new Date().toISOString().split('T')[0],
      description: "",
      amount: "",
      interest: "",
      accountId: "",
      isPayment: false,
      bankId: "",
      creditId: "",
      liabilityId: ""
    });
  };

  const handleDelete = async (item: any) => {
    if (!confirm(`Supprimer cette ${item.type === 'payment' ? 'transaction' : 'dépense'} ?`)) return;
    try {
      if (item.type === 'payment') {
        await deletePayment(item.id);
      } else {
        await deleteExpense(item.id);
      }
      fetchData();
    } catch (err) {
      alert("Erreur lors de la suppression.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importExpensesCSV(file);
      fetchData();
    } catch (err) {
      alert("Erreur lors de l'importation.");
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
          <h1 className="text-3xl font-bold text-slate-900">Dépenses</h1>
          <p className="text-slate-500 mt-1">Suivez vos dépenses et remboursements de dettes</p>
        </div>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer shadow-sm">
            <Upload size={18} />
            <span>Importer CSV</span>
            <input type="file" className="hidden" accept=".csv" onChange={handleImport} />
          </label>
          <button 
            onClick={() => exportExpensesCSV()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={18} />
            <span>Exporter CSV</span>
          </button>
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
                {editingId ? <Pencil className="text-orange-500" size={20} /> : <Plus className="text-blue-600" size={20} />}
                {editingId ? (isEditingPayment ? "Modifier Remboursement" : "Modifier Dépense") : "Nouvelle Transaction"}
              </div>
              {editingId && (
                <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              )}
            </h2>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <input
                  type="checkbox"
                  id="isPayment"
                  checked={newExpense.isPayment}
                  onChange={(e) => setNewExpense({ ...newExpense, isPayment: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPayment" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Remboursement de dette ?
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="date"
                    required
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
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
                    placeholder={newExpense.isPayment ? "ex: Paiement hypothèque..." : "ex: Courses, Loyer..."}
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Montant Total</label>
                <div className="relative">
                  <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {newExpense.isPayment && (
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
                      value={newExpense.interest}
                      onChange={(e) => setNewExpense({ ...newExpense, interest: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              {newExpense.isPayment ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payé de (Source)</label>
                    <div className="relative">
                      <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select
                        value={newExpense.bankId}
                        onChange={(e) => setNewExpense({ ...newExpense, bankId: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                      >
                        <option value="">Sélectionner un compte (optionnel)</option>
                        {banks.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dette remboursée (Cible)</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <select
                        required
                        value={newExpense.creditId}
                        onChange={(e) => setNewExpense({ ...newExpense, creditId: e.target.value })}
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
                </>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Compte</label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      value={newExpense.accountId}
                      onChange={(e) => setNewExpense({ ...newExpense, accountId: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none"
                    >
                      <option value="">Sélectionner un compte (optionnel)</option>
                      <optgroup label="Banques">
                        {banks.map(b => (
                          <option key={`bank-${b.id}`} value={`bank:${b.id}`}>{b.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Crédits">
                        {credits.map(c => (
                          <option key={`credit-${c.id}`} value={`credit:${c.id}`}>{c.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Dettes">
                        {liabilities.map(l => (
                          <option key={`liability-${l.id}`} value={`liability:${l.id}`}>{l.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                </div>
              )}

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

        {/* Liste des dépenses */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h2 className="text-lg font-bold text-slate-900">Historique des transactions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Compte</th>
                    <th className="px-6 py-4 text-right">Montant</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                        Aucune transaction enregistrée
                      </td>
                    </tr>
                  ) : (
                    expenses.map((item) => {
                      let account = "";
                      if (item.type === 'payment') {
                        const bankName = banks.find(b => b.id === item.bank_id)?.name;
                        const creditName = item.credit_id 
                          ? credits.find(c => c.id === item.credit_id)?.name 
                          : liabilities.find(l => l.id === item.liability_id)?.name;
                        account = `${bankName || 'Cash'} → ${creditName}`;
                      } else {
                        account = item.bank_id 
                          ? banks.find(b => b.id === item.bank_id)?.name 
                          : (item.credit_id 
                              ? credits.find(c => c.id === item.credit_id)?.name 
                              : (item.liability_id ? liabilities.find(l => l.id === item.liability_id)?.name : 'N/A'));
                      }
                      
                      return (
                        <tr key={`${item.type}-${item.id}`} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4 text-slate-600 text-sm">{item.date}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{item.description}</span>
                              {item.type === 'payment' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">Remboursement</span>
                                  {item.interest > 0 && (
                                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-tight">
                                      dont {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(item.interest)} d'intérêt
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {account !== 'N/A' ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.type === 'payment' ? 'bg-blue-100 text-blue-700' : (item.bank_id ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}`}>
                                {account}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-bold ${item.type === 'payment' ? 'text-blue-600' : 'text-slate-900'}`}>
                              {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(item.amount)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              >
                                <Pencil size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(item)}
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
