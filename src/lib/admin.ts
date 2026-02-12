import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

// Returns admin wallet addresses from the ADMIN_WALLETS environment variable.
// The env var is expected to be a comma-separated list of Ethereum addresses.
// All addresses are lowercased for case-insensitive comparison, and empty
// entries (from trailing commas or whitespace) are filtered out.
function getAdminWallets(): string[] {
  const raw = process.env.ADMIN_WALLETS || "";
  return raw
    .split(",")
    .map((addr) => addr.trim().toLowerCase())
    .filter(Boolean);
}

// Checks if the current session user is an admin by comparing their wallet
// address against the ADMIN_WALLETS allowlist. Returns the lowercased wallet
// address if the user is authenticated AND is an admin, or null otherwise.
// Callers should treat a null return as an authorization failure.
export async function requireAdmin(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const wallet = session.user.id.toLowerCase();
  return getAdminWallets().includes(wallet) ? wallet : null;
}
