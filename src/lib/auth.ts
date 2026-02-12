import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SiweMessage } from "siwe";

// NextAuth v4 configuration with SIWE (Sign-In with Ethereum) credentials.
// The CredentialsProvider accepts a serialised SIWE message and its EIP-191
// signature.  On `authorize`, we reconstruct the SiweMessage, verify the
// cryptographic signature, and return the recovered Ethereum address as the
// user identity.  Sessions use JWTs (no database) with a 7-day lifetime.
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      // Unique provider ID referenced by signIn("siwe") on the client
      id: "siwe",
      name: "Ethereum",
      credentials: {
        message: { label: "Message", type: "text" },
        signature: { label: "Signature", type: "text" },
      },
      async authorize(credentials) {
        // Guard: both fields are required for verification
        if (!credentials?.message || !credentials?.signature) return null;
        try {
          // Parse the EIP-4361 message string back into a structured object
          const siweMessage = new SiweMessage(credentials.message);
          // Verify the signature matches the message content and was produced
          // by the claimed address
          const result = await siweMessage.verify({
            signature: credentials.signature,
          });
          if (!result.success) return null;
          // Return the verified address as both `id` and `name` so it is
          // available in the JWT and session callbacks below
          return { id: siweMessage.address, name: siweMessage.address };
        } catch {
          // Any verification failure (malformed message, invalid sig, etc.)
          // results in a rejected login
          return null;
        }
      },
    }),
  ],
  // Use JWT strategy so no database session table is needed
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  callbacks: {
    // Persist the Ethereum address into the JWT on first sign-in
    async jwt({ token, user }) {
      if (user) token.address = user.id;
      return token;
    },
    // Expose the Ethereum address on the client-side session object.
    // The Session type is augmented in src/types/next-auth.d.ts to include
    // `user.id` for the wallet address.
    async session({ session, token }) {
      if (token.address && session.user) {
        session.user.id = token.address as string;
        session.user.name = token.address as string;
      }
      return session;
    },
  },
  // AUTH_SECRET / NEXTAUTH_SECRET is read automatically by next-auth v4,
  // but we set it explicitly for clarity
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
};
