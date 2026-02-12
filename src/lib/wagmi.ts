import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";
import { http } from "viem";
import type { Chain } from "viem";

// Fraxtal L2 chain definition (chain ID 252).
// Fraxtal is a modular rollup blockchain built on the OP Stack,
// using frxETH as its native gas token.
export const fraxtal = {
  id: 252,
  name: "Fraxtal",
  nativeCurrency: { name: "Frax Ether", symbol: "frxETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.frax.com"] },
  },
  blockExplorers: {
    default: { name: "Fraxscan", url: "https://fraxscan.com" },
  },
} as const satisfies Chain;

// Wagmi + RainbowKit unified config.
// `getDefaultConfig` merges wagmi's `createConfig` with RainbowKit's default
// wallet list and connectors, reducing boilerplate. The `ssr: true` flag
// enables server-side rendering support by deferring hydration of wallet state.
export const wagmiConfig = getDefaultConfig({
  appName: "Depth Perception",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "placeholder",
  chains: [mainnet, fraxtal],
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [fraxtal.id]: http("https://rpc.frax.com"),
  },
});
