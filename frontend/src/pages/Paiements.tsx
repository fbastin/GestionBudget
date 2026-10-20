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
import { todayLocal } from "../date";
import type { Asset, Bank, Credit, Liability, Payment } from "../types";
import { Loader2 } from "lucide-react";
import { money } from "../format";
import { accountLabelById } from "../accounts";
import { PaymentFields } from "../components/PaymentFields";
import { paymentColumns } from "../components/paymentColumns";
import {
  AccountBadge,
  ErrorNotice,
  Field,
  fieldControl,
  Flow,
  FormBand,
  History,
  HistoryRow,
  NoAccount,
  Page,
  PageHeader,
  RowNote,
  SubmitButton
} from "../components/TransactionLayout";

export function Paiements() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [newPayment, setNewPayment] = useState({
    date: todayLocal(),
    description: "",
    amount: "",
    interest: "",
    bankId: "",
    assetId: "",
    creditId: ""
  });

  // State only changes in the promise callbacks, once the requests are done: the initial load can run in an effect
  const loadData = () =>
    Promise.all([
      getPayments(),
      getBanks(),
      getAssets(),
      getCredits(),
      getLiabilities()
    ])
      .then(([paymentsRes, banksRes, assetsRes, creditsRes, liabilitiesRes]) => {
        setPayments(paymentsRes.data);
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

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    // saving: ignore a second click while the first one is being saved (it would create a duplicate)
    if (saving || !newPayment.description || !newPayment.amount || !newPayment.creditId) return;
    setSaving(true);

    try {
      let credit_id: number | null = null;
      let liability_id: number | null = null;
      let bank_id: number | null = null;
      let asset_id: number | null = null;

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
        date: todayLocal(),
        description: "",
        amount: "",
        interest: "",
        bankId: "",
        assetId: "",
        creditId: ""
      });
      setEditingId(null);
      fetchData();
    } catch {
      alert("Erreur lors de l'enregistrement du paiement.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (payment: Payment) => {
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
      date: todayLocal(),
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
    } catch {
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
    <Page>
      <PageHeader title="Paiements" subtitle="Remboursements de dettes" />
      <ErrorNotice message={error} />

      <FormBand onSubmit={handleAddPayment} editing={editingId ? String(editingId) : null} onCancel={cancelEdit}>
        <Field id="tx-date" label="Date" className={paymentColumns.date}>
          <input
            id="tx-date"
            type="date"
            required
            value={newPayment.date}
            onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
            className={fieldControl}
          />
        </Field>
        <Field id="tx-description" label="Description" className={paymentColumns.description}>
          <input
            id="tx-description"
            type="text"
            required
            placeholder="ex. : Paiement carte de crédit"
            value={newPayment.description}
            onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
            className={fieldControl}
          />
        </Field>
        <Field id="tx-amount" label="Montant" className={paymentColumns.amount}>
          <input
            id="tx-amount"
            type="number"
            step="0.01"
            required
            placeholder="0.00"
            value={newPayment.amount}
            onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
            className={fieldControl}
          />
        </Field>
        <PaymentFields
          value={newPayment}
          onChange={(change) => setNewPayment({ ...newPayment, ...change })}
          banks={banks}
          assets={assets}
          credits={credits}
          liabilities={liabilities}
        />
        <SubmitButton editing={!!editingId} saving={saving} className={paymentColumns.submit} />
      </FormBand>

      <History count={payments.length} noun="paiement" accountHeader="De → Vers" emptyText="Aucun paiement enregistré">
        {payments.map((payment) => {
          const bankName = payment.asset_id
            ? accountLabelById(payment.asset_id, assets)
            : payment.bank_id ? banks.find(b => b.id === payment.bank_id)?.name || "" : "";
          const debt = payment.credit_id
            ? <AccountBadge kind="credit" label={credits.find(c => c.id === payment.credit_id)?.name || ""} />
            : <AccountBadge kind="debt" label={liabilities.find(l => l.id === payment.liability_id)?.name || ""} />;
          return (
            <HistoryRow
              key={payment.id}
              date={payment.date}
              description={payment.description}
              note={payment.interest > 0 && <RowNote className="text-orange-500">dont {money(payment.interest)} d'intérêt</RowNote>}
              account={<Flow from={bankName ? <AccountBadge kind="bank" label={bankName} /> : <NoAccount label="Cash" />} to={debt} />}
              amount={money(payment.amount)}
              amountClassName="text-blue-600"
              editing={editingId === payment.id}
              onEdit={() => handleEdit(payment)}
              onDelete={() => handleDelete(payment.id)}
            />
          );
        })}
      </History>
    </Page>
  );
}
