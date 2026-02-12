import { createAuthenticationAdapter } from "@rainbow-me/rainbowkit";
import { SiweMessage } from "siwe";
import { signIn, signOut, getCsrfToken } from "next-auth/react";

// Bridges RainbowKit wallet signatures with NextAuth sessions.
//
// Flow:
// 1. `getNonce` — fetches a CSRF token from NextAuth to use as the SIWE nonce,
//    tying the signature to the current session and preventing replay attacks.
// 2. `createMessage` — builds an EIP-4361 SiweMessage with the user's address,
//    chain, and the fetched nonce.
// 3. `verify` — after the user signs in their wallet, the serialised message
//    and signature are sent to NextAuth's credentials provider (`siwe`) which
//    verifies the signature server-side and creates a JWT session.
// 4. `signOut` — destroys the NextAuth session without triggering a redirect.
export const siweAuthAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    // getCsrfToken() calls GET /api/auth/csrf which returns a server-generated
    // token. We reuse it as the SIWE nonce for simplicity.
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Failed to get CSRF token");
    return nonce;
  },

  createMessage: ({ nonce, address, chainId }) => {
    // Build the EIP-4361 SiweMessage and immediately serialize it to a
    // plain-text string via `prepareMessage()`. Returning a string (rather
    // than the SiweMessage object) is required because RainbowKit passes the
    // return value directly to wagmi's `signMessageAsync({ message })`, and
    // viem expects `message` to be a `string | { raw: Hex | ByteArray }`.
    // A SiweMessage object has neither of those shapes, so viem would send
    // `undefined` to the wallet's `personal_sign` RPC, causing signing to fail.
    return new SiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in to Depth Perception",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce,
    }).prepareMessage();
  },

  verify: async ({ message, signature }) => {
    // `message` is now the EIP-4361 plain-text string returned by
    // `createMessage` (already serialized). Pass it directly to NextAuth's
    // credentials provider, which parses it back into a SiweMessage
    // server-side for cryptographic verification.
    const result = await signIn("siwe", {
      message: message as string,
      signature,
      redirect: false,
    });
    return result?.ok ?? false;
  },

  signOut: async () => {
    // Destroy the NextAuth JWT session without a full-page redirect
    await signOut({ redirect: false });
  },
});
