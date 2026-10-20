import { useEffect, useRef } from "react";
import type React from "react";
import { AlertCircle, CreditCard, Download, HandCoins, Landmark, Pencil, Plus, Upload, X } from "lucide-react";
import { RowActions } from "./RowActions";

// Layout shared by Dépenses, Paiements and Entrées: a one-line header, the form as a band above the history,
// then the history in compact rows.

export const fieldLabel = "block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1";
export const fieldControl = "w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";
const smallButton = "inline-flex items-center gap-1.5 h-8 px-3 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:border-blue-500 hover:text-blue-600 transition-colors cursor-pointer";

type Accent = "blue" | "emerald";
const accents: Record<Accent, { band: string; button: string }> = {
  blue: { band: "bg-blue-50", button: "bg-blue-600 hover:bg-blue-700" },
  emerald: { band: "bg-emerald-50", button: "bg-emerald-600 hover:bg-emerald-700" },
};

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col gap-4">{children}</div>;
}

/** Title and subtitle on one line, the page's buttons on the right (under them on phones). */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">{subtitle}</p>
      {children && <div className="ml-auto flex gap-2">{children}</div>}
    </header>
  );
}

export function CsvButtons({ onImport, onExport, importTitle, exportTitle }: {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  importTitle: string;
  exportTitle: string;
}) {
  return (
    <>
      <label title={importTitle} className={smallButton}>
        <Upload size={16} />
        <span>Importer CSV</span>
        <input type="file" className="hidden" accept=".csv" onChange={onImport} />
      </label>
      <button onClick={onExport} title={exportTitle} className={smallButton}>
        <Download size={16} />
        <span>Exporter CSV</span>
      </button>
    </>
  );
}

export function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-sm text-red-600">
      <AlertCircle size={18} />
      <p>{message}</p>
    </div>
  );
}

/** The form, a band above the history that stays in view while the history scrolls on wide screens. Its fields
 * are laid on a 12-column grid sized by the band's width; on phones, the dense flow puts date and amount side by
 * side. editing names the transaction being edited, null for a new one. */
export function FormBand({ onSubmit, editing, onCancel, accent = "blue", toolbar, children }: {
  onSubmit: (e: React.FormEvent) => void;
  editing: string | null;
  onCancel: () => void;
  accent?: Accent;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  // Editing a row brings the form back into view on phones, where it does not stay at the top
  useEffect(() => {
    if (editing) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editing]);

  return (
    <div className="md:sticky md:top-0 z-10 -my-2 py-2 bg-slate-50">
      <form ref={ref} onSubmit={onSubmit} className={`@container rounded-2xl p-4 ${editing ? "bg-orange-50" : accents[accent].band}`}>
        {(toolbar || editing) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
            {toolbar}
            {editing && (
              <>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-orange-700">
                  <Pencil size={14} /> Modification en cours
                </span>
                <button type="button" onClick={onCancel} className="ml-auto flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
                  <X size={16} /> Annuler
                </button>
              </>
            )}
          </div>
        )}
        <div className="grid grid-cols-12 grid-flow-row-dense gap-3">{children}</div>
      </form>
    </div>
  );
}

/** A field of the band: its label above its control. className gives its columns. */
export function Field({ id, label, title, className, children }: {
  id: string;
  label: string;
  title?: string;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={fieldLabel} title={title}>{label}</label>
      {children}
    </div>
  );
}

export function SubmitButton({ editing, saving, accent = "blue", className }: {
  editing: boolean;
  saving: boolean;
  accent?: Accent;
  className: string;
}) {
  return (
    <div className={`self-end ${className}`}>
      <button
        type="submit"
        disabled={saving}
        className={`w-full h-10 px-3 ${editing ? "bg-orange-500 hover:bg-orange-600" : accents[accent].button} text-white text-sm rounded-lg font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {editing ? <Pencil size={16} /> : <Plus size={16} />}
        {editing ? "Enregistrer" : "Ajouter"}
      </button>
    </div>
  );
}

/** The history: narrow lists show the date and the account under the description. */
export function History({ count, noun, accountHeader, emptyText, children }: {
  count: number;
  noun: string;
  accountHeader: string;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section className="@container bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-baseline gap-3">
        <h2 className="font-bold text-slate-900">Historique</h2>
        <span className="text-sm text-slate-500">{count} {noun}{count > 1 ? "s" : ""}</span>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            <th className="px-4 py-2 hidden @xl:table-cell">Date</th>
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2 hidden @xl:table-cell">{accountHeader}</th>
            <th className="px-4 py-2 text-right">Montant</th>
            <th className="w-20"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {count === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">{emptyText}</td>
            </tr>
          ) : children}
        </tbody>
      </table>
    </section>
  );
}

export function HistoryRow({ date, description, note, account, amount, amountClassName, editing, onEdit, onDelete }: {
  date: string;
  description: string;
  note?: React.ReactNode;
  account: React.ReactNode;
  amount: string;
  amountClassName: string;
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className={`group transition-colors ${editing ? "bg-orange-50" : "hover:bg-slate-50"}`}>
      <td className="px-4 py-2 text-slate-500 whitespace-nowrap tabular-nums hidden @xl:table-cell">{date}</td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold text-slate-900">{description}</span>
          {note}
        </div>
        <div className="@xl:hidden mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="tabular-nums">{date}</span>
          {account}
        </div>
      </td>
      <td className="px-4 py-2 whitespace-nowrap hidden @xl:table-cell">{account}</td>
      <td className={`px-4 py-2 text-right font-bold whitespace-nowrap tabular-nums ${amountClassName}`}>{amount}</td>
      <td className="pr-2 py-1 text-right">
        <RowActions onEdit={onEdit} onDelete={onDelete} />
      </td>
    </tr>
  );
}

/** A small uppercase note after a description, e.g. the interest of a payment. */
export function RowNote({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-bold uppercase tracking-tight ${className}`}>{children}</span>;
}

export type AccountKind = "bank" | "credit" | "debt" | "payment";

const badgeStyles: Record<AccountKind, { className: string; icon: React.ReactNode; title: string }> = {
  bank: { className: "bg-emerald-50 text-emerald-700", icon: <Landmark size={12} />, title: "Compte bancaire" },
  credit: { className: "bg-orange-50 text-orange-700", icon: <CreditCard size={12} />, title: "Crédit" },
  debt: { className: "bg-orange-50 text-orange-700", icon: <CreditCard size={12} />, title: "Dette" },
  payment: { className: "bg-blue-50 text-blue-700", icon: <HandCoins size={12} />, title: "Remboursement" },
};

/** An account in the history, with an icon that tells a bank account from a credit of the same name. */
export function AccountBadge({ kind, label }: { kind: AccountKind; label: string }) {
  const style = badgeStyles[kind];
  return (
    <span title={style.title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
      {style.icon}
      {label}
    </span>
  );
}

/** No account: "—", or what stands for it (Cash, Extérieur). */
export function NoAccount({ label = "—", title = "Aucun compte" }: { label?: string; title?: string }) {
  return <span title={title} className="text-xs italic text-slate-400">{label}</span>;
}

/** Money going from one account to another. */
export function Flow({ from, to }: { from: React.ReactNode; to: React.ReactNode }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {from}
      <span className="text-slate-400">→</span>
      {to}
    </span>
  );
}
