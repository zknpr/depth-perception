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
    // Construct a structured SIWE message. This object is passed to
    // RainbowKit's signing prompt and later to `verify`.
    return new SiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in to Depth Perception",
      uri: window.location.origin,
      version: "1",
      chainId,
      nonce,
    });
  },

  verify: async ({ message, signature }) => {
    // `message` is the SiweMessage returned by `createMessage`.
    // `prepareMessage()` serialises it to the EIP-4361 plain-text format
    // which the server-side provider can parse back into a SiweMessage.
    const result = await signIn("siwe", {
      message: (message as SiweMessage).prepareMessage(),
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
