import type { Asset } from "./types";

type Account = Pick<Asset, "id" | "name" | "location">;

/** Name of an account, with its location when another account has the same name, so that the lists tell
 * them apart: "Tangerine Equity Growth Portfolio (CELI)" and "... (REER)". */
export function accountLabel(account: Account, accounts: Account[]): string {
  const twin = accounts.some((a) => a.id !== account.id && a.name === account.name);
  return twin && account.location ? `${account.name} (${account.location})` : account.name;
}

/** Label of the account with this id; "" when there is none. */
export function accountLabelById(id: number | null | undefined, accounts: Account[]): string {
  const account = accounts.find((a) => a.id === id);
  return account ? accountLabel(account, accounts) : "";
}
