import "next-auth";
import "next-auth/jwt";

// Module augmentation for next-auth v4.
// Extends the default Session and JWT types to include the Ethereum wallet
// address set during SIWE authentication (see src/lib/auth.ts callbacks).
declare module "next-auth" {
  interface Session {
    user: {
      /** Ethereum wallet address (checksummed) */
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** Ethereum wallet address persisted in the JWT */
    address?: string;
  }
}
