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
  getAssets,
  getCredits,
  getLiabilities,
  exportExpensesCSV,
  importExpensesCSV,
  convertExpenseToPayment,
  convertPaymentToExpense
} from "../api";
import { todayLocal } from "../date";
import type { Asset, Bank, Credit, Expense, Liability, Payment } from "../types";
import { Loader2 } from "lucide-react";
import { money } from "../format";
import { accountLabelById } from "../accounts";
import { AccountOptions, DebtOptions } from "../components/AccountOptions";
import { PaymentFields } from "../components/PaymentFields";
import { paymentColumns } from "../components/paymentColumns";
import {
  AccountBadge,
  CsvButtons,
  ErrorNotice,
  Field,
  fieldControl,
  FormBand,
  History,
  HistoryRow,
  NoAccount,
  Page,
  PageHeader,
  RowNote,
  SubmitButton,
  type AccountKind
} from "../components/TransactionLayout";

// Expenses and payments shown in a single list
type Transaction = (Expense & { type: "expense" }) | (Payment & { type: "payment" });

// Columns of an expense's fields; a payment's are paymentColumns
const expenseColumns = {
  date: "col-span-6 @2xl:col-span-3 @5xl:col-span-2",
  description: "col-span-12 @2xl:col-span-6 @5xl:col-span-3",
  amount: "col-span-6 @2xl:col-span-3 @5xl:col-span-2",
  account: "col-span-12 @2xl:col-span-8 @5xl:col-span-3",
  submit: "col-span-12 @2xl:col-span-4 @5xl:col-span-2",
};

export function Depenses() {
  const [expenses, setExpenses] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newExpense, setNewExpense] = useState({
    date: todayLocal(),
    description: "",
    amount: "",
    interest: "",
    accountId: "", // format: "bank:ID" or "asset:ID" or "credit:ID" or "liability:ID"
    isPayment: false,
    bankId: "",
    creditId: "",
    liabilityId: ""
  });

  // State only changes in the promise callbacks, once the requests are done: the initial load can run in an effect
  const loadData = () =>
    Promise.all([
      getExpenses(),
      getPayments(),
      getBanks(),
      getAssets(),
      getCredits(),
      getLiabilities()
    ])
      .then(([expensesRes, paymentsRes, banksRes, assetsRes, creditsRes, liabilitiesRes]) => {
        const combined = [
          ...expensesRes.data.map((e: Expense) => ({ ...e, type: 'expense' as const })),
          ...paymentsRes.data.map((p: Payment) => ({ ...p, type: 'payment' as const }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setExpenses(combined);
        setBanks(banksRes.data);
        setAssets(assetsRes.data);
        setCredits(creditsRes.data);
        setLiabilities(liabilitiesRes.data);
        setError(null);
      })
      .catch((err) => {
        setError("Erreur lors du chargement des données.");
        console.error(err);
      })
      .finally(() => setLoading(false));

  const fetchData = async () => {
    setLoading(true);
    await loadData();
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    // saving: ignore a second click while the first one is being saved (it would create a duplicate)
    if (saving || !newExpense.description || !newExpense.amount) return;
    setSaving(true);

    try {
      if (newExpense.isPayment) {
        let credit_id: number | null = null;
        let liability_id: number | null = null;
        let bank_id: number | null = null;
        let asset_id: number | null = null;

        if (newExpense.creditId.startsWith("credit:")) {
          credit_id = parseInt(newExpense.creditId.split(":")[1]);
        } else if (newExpense.creditId.startsWith("liability:")) {
          liability_id = parseInt(newExpense.creditId.split(":")[1]);
        }

        if (newExpense.bankId.startsWith("bank:")) {
            bank_id = parseInt(newExpense.bankId.split(":")[1]);
        } else if (newExpense.bankId.startsWith("asset:")) {
            asset_id = parseInt(newExpense.bankId.split(":")[1]);
            const assetObj = assets.find(a => a.id === asset_id);
            if (assetObj && assetObj.bank_id) bank_id = assetObj.bank_id;
        }

        const payload = {
          date: newExpense.date,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          interest: parseFloat(newExpense.interest) || 0,
          bank_id,
          asset_id,
          credit_id,
          liability_id
        };

        if (editingId) {
          if (isEditingPayment) {
            await updatePayment(editingId, payload);
          } else {
            await convertExpenseToPayment(editingId, payload);
          }
        } else {
          await createPayment(payload);
        }
      } else {
        let bank_id: number | null = null;
        let asset_id: number | null = null;
        let credit_id: number | null = null;
        let liability_id: number | null = null;

        if (newExpense.accountId.startsWith("bank:")) {
          bank_id = parseInt(newExpense.accountId.split(":")[1]);
        } else if (newExpense.accountId.startsWith("asset:")) {
          asset_id = parseInt(newExpense.accountId.split(":")[1]);
          const assetObj = assets.find(a => a.id === asset_id);
          if (assetObj && assetObj.bank_id) bank_id = assetObj.bank_id;
        } else if (newExpense.accountId.startsWith("credit:")) {
          credit_id = parseInt(newExpense.accountId.split(":")[1]);
        } else if (newExpense.accountId.startsWith("liability:")) {
          liability_id = parseInt(newExpense.accountId.split(":")[1]);
        }

        const payload = {
          date: newExpense.date,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          bank_id,
          asset_id,
          credit_id,
          liability_id
        };

        if (editingId) {
          if (!isEditingPayment) {
            await updateExpense(editingId, payload);
          } else {
            await convertPaymentToExpense(editingId, payload);
          }
        } else {
          await createExpense(payload);
        }
      }

      setNewExpense({
        date: todayLocal(),
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
    } catch {
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: Transaction) => {
    setEditingId(item.id);
    setIsEditingPayment(item.type === 'payment');
    
    if (item.type === 'payment') {
      let creditId = "";
      if (item.credit_id) creditId = `credit:${item.credit_id}`;
      else if (item.liability_id) creditId = `liability:${item.liability_id}`;

      let bankId = "";
      if (item.asset_id) bankId = `asset:${item.asset_id}`;
      else if (item.bank_id) bankId = `bank:${item.bank_id}`;

      setNewExpense({
        date: item.date,
        description: item.description,
        amount: item.amount.toString(),
        interest: item.interest?.toString() || "",
        accountId: "",
        isPayment: true,
        bankId,
        creditId,
        liabilityId: ""
      });
    } else {
      let accountId = "";
      if (item.asset_id) accountId = `asset:${item.asset_id}`;
      else if (item.bank_id) accountId = `bank:${item.bank_id}`;
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
      date: todayLocal(),
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

  const handleDelete = async (item: Transaction) => {
    if (!confirm(`Supprimer cette ${item.type === 'payment' ? 'transaction' : 'dépense'} ?`)) return;
    try {
      if (item.type === 'payment') {
        await deletePayment(item.id);
      } else {
        await deleteExpense(item.id);
      }
      fetchData();
    } catch {
      alert("Erreur lors de la suppression.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await importExpensesCSV(file);
      alert(res.data.message);
      fetchData();
    } catch {
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

  const { isPayment } = newExpense;

  // What a transaction is charged to; a payment goes from an account to a debt
  const accountOf = (item: Transaction): { kind: AccountKind; label: string } | null => {
    const bankName = item.asset_id
      ? accountLabelById(item.asset_id, assets)
      : item.bank_id ? banks.find(b => b.id === item.bank_id)?.name || "" : "";
    if (item.type === "payment") {
      const debtName = item.credit_id
        ? credits.find(c => c.id === item.credit_id)?.name
        : liabilities.find(l => l.id === item.liability_id)?.name;
      return { kind: "payment", label: `${bankName || "Cash"} → ${debtName}` };
    }
    if (bankName) return { kind: "bank", label: bankName };
    if (item.credit_id) return { kind: "credit", label: credits.find(c => c.id === item.credit_id)?.name || "" };
    if (item.liability_id) return { kind: "debt", label: liabilities.find(l => l.id === item.liability_id)?.name || "" };
    return null;
  };

  const columns = isPayment ? paymentColumns : expenseColumns;

  return (
    <Page>
      <PageHeader title="Dépenses" subtitle="Dépenses et remboursements de dettes">
        <CsvButtons
          onImport={handleImport}
          onExport={() => exportExpensesCSV()}
          importTitle="Dépenses, paiements et entrées, au format de l'export"
          exportTitle="Dépenses, paiements et entrées"
        />
      </PageHeader>
      <ErrorNotice message={error} />

      <FormBand
        onSubmit={handleAddExpense}
        editing={editingId ? `${isEditingPayment ? "payment" : "expense"}-${editingId}` : null}
        onCancel={cancelEdit}
        toolbar={
          <div role="radiogroup" aria-label="Type de transaction" className="flex gap-0.5 p-[3px] h-10 bg-white border border-slate-200 rounded-lg">
            {([[false, "Dépense"], [true, "Remboursement de dette"]] as const).map(([payment, text]) => (
              <label key={text} className="relative flex">
                <input
                  type="radio"
                  name="transaction-type"
                  checked={isPayment === payment}
                  onChange={() => setNewExpense({ ...newExpense, isPayment: payment })}
                  className="peer sr-only"
                />
                <span className="grid place-items-center px-3 rounded-md text-sm text-slate-600 cursor-pointer hover:text-blue-600 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:hover:text-white peer-checked:font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500">
                  {text}
                </span>
              </label>
            ))}
          </div>
        }
      >
        <Field id="tx-date" label="Date" className={columns.date}>
          <input
            id="tx-date"
            type="date"
            required
            value={newExpense.date}
            onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
            className={fieldControl}
          />
        </Field>
        <Field id="tx-description" label="Description" className={columns.description}>
          <input
            id="tx-description"
            type="text"
            required
            placeholder={isPayment ? "ex. : Paiement hypothèque" : "ex. : Épicerie, Hydro-Québec"}
            value={newExpense.description}
            onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
            className={fieldControl}
          />
        </Field>
        <Field id="tx-amount" label="Montant" className={columns.amount}>
          <input
            id="tx-amount"
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={newExpense.amount}
            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
            className={fieldControl}
          />
        </Field>

        {isPayment ? (
          <PaymentFields
            value={newExpense}
            onChange={(change) => setNewExpense({ ...newExpense, ...change })}
            banks={banks}
            assets={assets}
            credits={credits}
            liabilities={liabilities}
          />
        ) : (
          <Field id="tx-account" label="Compte" className={expenseColumns.account}>
            <select
              id="tx-account"
              value={newExpense.accountId}
              onChange={(e) => setNewExpense({ ...newExpense, accountId: e.target.value })}
              className={fieldControl}
            >
              <option value="">Aucun compte</option>
              <AccountOptions banks={banks} assets={assets} />
              <DebtOptions credits={credits} liabilities={liabilities} />
            </select>
          </Field>
        )}

        <SubmitButton editing={!!editingId} saving={saving} className={columns.submit} />
      </FormBand>

      <History count={expenses.length} noun="transaction" accountHeader="Compte" emptyText="Aucune transaction enregistrée">
        {expenses.map((item) => {
          const account = accountOf(item);
          return (
            <HistoryRow
              key={`${item.type}-${item.id}`}
              date={item.date}
              description={item.description}
              note={item.type === "payment" && (
                <RowNote className="text-blue-500">
                  Remboursement
                  {item.interest > 0 && <span className="text-orange-500"> · dont {money(item.interest)} d'intérêt</span>}
                </RowNote>
              )}
              account={account ? <AccountBadge kind={account.kind} label={account.label} /> : <NoAccount />}
              amount={money(item.amount)}
              amountClassName={item.type === "payment" ? "text-blue-600" : "text-slate-900"}
              editing={editingId === item.id && isEditingPayment === (item.type === "payment")}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          );
        })}
      </History>
    </Page>
  );
}
