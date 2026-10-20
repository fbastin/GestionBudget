import type { Asset, Bank, Credit, Liability } from "../types";
import { AccountOptions, DebtOptions } from "./AccountOptions";
import { paymentColumns } from "./paymentColumns";
import { Field, fieldControl } from "./TransactionLayout";

/** What the payment fields edit: "credit:ID" or "liability:ID" for the debt, "bank:ID" or "asset:ID" for the account. */
export type PaymentChoice = { interest: string; bankId: string; creditId: string };

const INTEREST_NOTE = "La portion d'intérêt n'est pas déduite de la dette";

/** Interest, source account and debt of a payment (Dépenses and Paiements), after its date, description and amount. */
export function PaymentFields({ value, onChange, banks, assets, credits, liabilities }: {
  value: PaymentChoice;
  onChange: (change: Partial<PaymentChoice>) => void;
  banks: Bank[];
  assets: Asset[];
  credits: Credit[];
  liabilities: Liability[];
}) {
  return (
    <>
      <Field id="tx-interest" label="Dont intérêt" title={INTEREST_NOTE} className={paymentColumns.interest}>
        <input
          id="tx-interest"
          type="number"
          step="0.01"
          placeholder="0.00"
          title={INTEREST_NOTE}
          value={value.interest}
          onChange={(e) => onChange({ interest: e.target.value })}
          className={fieldControl}
        />
      </Field>
      <Field id="tx-source" label="Payé de" className={paymentColumns.source}>
        <select id="tx-source" value={value.bankId} onChange={(e) => onChange({ bankId: e.target.value })} className={fieldControl}>
          <option value="">Aucun compte</option>
          <AccountOptions banks={banks} assets={assets} />
        </select>
      </Field>
      <Field id="tx-debt" label="Dette remboursée" className={paymentColumns.debt}>
        <select id="tx-debt" required value={value.creditId} onChange={(e) => onChange({ creditId: e.target.value })} className={fieldControl}>
          <option value="">Choisir une dette</option>
          <DebtOptions credits={credits} liabilities={liabilities} />
        </select>
      </Field>
    </>
  );
}
