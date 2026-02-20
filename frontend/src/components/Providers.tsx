"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { baseSepolia } from "viem/chains";
import { http } from "viem";

const queryClient = new QueryClient();

export const wagmiConfig = createConfig({
    chains: [baseSepolia],
    transports: {
        [baseSepolia.id]: http(),
    },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "insert-privy-app-id-here"}
            config={{
                appearance: {
                    theme: "dark",
                    accentColor: "#2A5ADA", // Chainlink Blue
                    logo: "https://cryptologos.cc/logos/chainlink-link-logo.png",
                },
                defaultChain: baseSepolia,
                supportedChains: [baseSepolia],
            }}
        >
            <QueryClientProvider client={queryClient}>
                <WagmiProvider config={wagmiConfig}>
                    {children}
                </WagmiProvider>
            </QueryClientProvider>
        </PrivyProvider>
    );
}
