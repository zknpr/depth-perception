import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// next-auth v4 App Router integration.
// `NextAuth(authOptions)` returns a unified handler that processes all
// authentication routes (sign-in, sign-out, session, CSRF, callback, etc.)
// under the `/api/auth/*` catch-all segment.
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
