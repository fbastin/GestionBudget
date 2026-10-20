import { accountLabel } from "../accounts";
import type { Asset, Bank, Credit, Liability } from "../types";

/** Options of the account selects: the accounts of each bank, or the bank itself when it has none.
 * The groups must stay directly under the select: an option in an optgroup nested in another one is left out
 * of the select's options by the browsers, so it can be seen but not chosen. */
export function AccountOptions({ banks, assets }: { banks: Bank[]; assets: Asset[] }) {
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
              <option key={`asset-${a.id}`} value={`asset:${a.id}`}>{accountLabel(a, assets)}</option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

/** Options of the debt selects: the credits, then every debt. */
export function DebtOptions({ credits, liabilities }: { credits: Credit[]; liabilities: Liability[] }) {
  return (
    <>
      <optgroup label="Crédits">
        {credits.map((c) => (
          <option key={`credit-${c.id}`} value={`credit:${c.id}`}>{c.name}</option>
        ))}
      </optgroup>
      <optgroup label="Dettes">
        {liabilities.map((l) => (
          <option key={`liability-${l.id}`} value={`liability:${l.id}`}>{l.name}</option>
        ))}
      </optgroup>
    </>
  );
}
