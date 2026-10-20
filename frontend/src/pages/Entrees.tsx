import React, { useEffect, useState } from "react";
import { getDeposits, createDeposit, updateDeposit, deleteDeposit, getBanks, getAssets } from "../api";
import { todayLocal } from "../date";
import type { Asset, Bank, Deposit } from "../types";
import { Loader2 } from "lucide-react";
import { money } from "../format";
import { accountLabelById } from "../accounts";
import { AccountOptions } from "../components/AccountOptions";
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
  SubmitButton
} from "../components/TransactionLayout";

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
    assetId ? accountLabelById(assetId, assets) : bankId ? banks.find((b) => b.id === bankId)?.name : undefined;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <Page>
      <PageHeader title="Entrées" subtitle="Paies, virements reçus : l'argent qui arrive sur vos comptes" />
      <ErrorNotice message={error} />

      <FormBand onSubmit={handleSave} editing={editingId ? String(editingId) : null} onCancel={resetForm} accent="emerald">
        <Field id="tx-date" label="Date" className="col-span-6 @2xl:col-span-3 @5xl:col-span-2">
          <input id="tx-date" type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={fieldControl} />
        </Field>
        <Field id="tx-description" label="Description" className="col-span-12 @2xl:col-span-6 @5xl:col-span-7">
          <input id="tx-description" type="text" required placeholder="ex. : Paie, virement d'épargne" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldControl} />
        </Field>
        <Field id="tx-amount" label="Montant" className="col-span-6 @2xl:col-span-3 @5xl:col-span-3">
          <input id="tx-amount" type="number" step="0.01" min="0" required placeholder="0.00" value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })} className={fieldControl} />
        </Field>
        <Field id="tx-account" label="Reçu sur" className="col-span-12 @2xl:col-span-5">
          <select id="tx-account" required value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} className={fieldControl}>
            <option value="">Choisir un compte</option>
            <AccountOptions banks={banks} assets={assets} />
          </select>
        </Field>
        <Field id="tx-source" label="Provenance" title="Un compte de provenance est débité du montant" className="col-span-12 @2xl:col-span-4 @5xl:col-span-5">
          <select id="tx-source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={fieldControl}>
            <option value="">Extérieur (paie, autre personne…)</option>
            <AccountOptions banks={banks} assets={assets} />
          </select>
        </Field>
        <SubmitButton editing={!!editingId} saving={saving} accent="emerald" className="col-span-12 @2xl:col-span-3 @5xl:col-span-2" />
      </FormBand>

      <History count={deposits.length} noun="entrée" accountHeader="De → Vers" emptyText="Aucune entrée enregistrée">
        {deposits.map((deposit) => {
          const source = accountName(deposit.source_bank_id, deposit.source_asset_id);
          return (
            <HistoryRow
              key={deposit.id}
              date={deposit.date}
              description={deposit.description}
              account={
                <Flow
                  from={source ? <AccountBadge kind="bank" label={source} /> : <NoAccount label="Extérieur" title="Reçu de l'extérieur" />}
                  to={<AccountBadge kind="bank" label={accountName(deposit.bank_id, deposit.asset_id) || ""} />}
                />
              }
              amount={`+${money(deposit.amount)}`}
              amountClassName="text-emerald-600"
              editing={editingId === deposit.id}
              onEdit={() => handleEdit(deposit)}
              onDelete={() => handleDelete(deposit.id)}
            />
          );
        })}
      </History>
    </Page>
  );
}
