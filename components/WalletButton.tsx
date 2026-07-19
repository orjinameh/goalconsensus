"use client";

import { useState, useEffect, useCallback } from "react";
import { Wallet, LogOut, Loader2, Copy, Check, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

interface User {
  address: string;
  totalStaked: number;
  totalWon: number;
  betsCount: number;
}

interface FaucetResult {
  success?: boolean;
  alreadyReceived?: boolean;
  amount?: number;
  txHash?: string;
  explorerUrl?: string;
  message?: string;
}

export function WalletButton() {
  const [user, setUser] = useState<User | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [faucetStatus, setFaucetStatus] = useState<FaucetResult | null>(null);
  const [claimingFaucet, setClaimingFaucet] = useState(false);
  const [showFaucetPrompt, setShowFaucetPrompt] = useState(false);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem("gc-auth-token");
    if (!token) return;
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        localStorage.removeItem("gc-auth-token");
      }
    } catch {
      localStorage.removeItem("gc-auth-token");
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleConnect = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to connect your wallet");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const address = accounts[0];

      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const nonceData = await nonceRes.json();
      if (!nonceData.message) {
        console.error("Nonce failed:", nonceData);
        setConnecting(false);
        return;
      }

      const signature = (await window.ethereum.request({
        method: "personal_sign",
        params: [nonceData.message, address],
      })) as string;

      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });
      const data = await verifyRes.json();

      if (data.token && data.user) {
        localStorage.setItem("gc-auth-token", data.token);
        setUser(data.user);
        setShowFaucetPrompt(true);
      }
    } catch (err) {
      console.error("Wallet connection failed:", err);
    }
    setConnecting(false);
  };

  const handleClaimFaucet = async () => {
    setClaimingFaucet(true);
    try {
      const token = localStorage.getItem("gc-auth-token");
      const res = await fetch("/api/auth/faucet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data: FaucetResult = await res.json();
      setFaucetStatus(data);
      setShowFaucetPrompt(false);
    } catch {
      setFaucetStatus({ success: false, message: "Faucet request failed" });
    }
    setClaimingFaucet(false);
  };

  const handleDisconnect = () => {
    localStorage.removeItem("gc-auth-token");
    setUser(null);
    setFaucetStatus(null);
    setShowFaucetPrompt(false);
  };

  const copyAddress = () => {
    if (user?.address) {
      navigator.clipboard.writeText(user.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shortAddress = user?.address
    ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}`
    : "";

  if (user) {
    return (
      <div className="flex items-center gap-2">
        {/* Faucet status message */}
        {faucetStatus && (
          <div className={cn(
            "hidden md:flex items-center gap-1.5 text-2xs px-2.5 py-1 rounded-lg border",
            faucetStatus.success || faucetStatus.alreadyReceived
              ? "bg-accent-green-dim border-accent-green/20 text-accent-green"
              : "bg-accent-yellow-dim border-accent-yellow/20 text-accent-yellow"
          )}>
            <Droplets size={10} />
            {faucetStatus.success ? `${faucetStatus.amount} USDC sent` : faucetStatus.message}
            {faucetStatus.txHash && faucetStatus.explorerUrl && (
              <a href={faucetStatus.explorerUrl} target="_blank" rel="noopener noreferrer" className="underline ml-1">tx ↗</a>
            )}
          </div>
        )}

        {/* Faucet claim prompt */}
        {showFaucetPrompt && !faucetStatus && (
          <button
            onClick={handleClaimFaucet}
            disabled={claimingFaucet}
            className="hidden md:flex items-center gap-1.5 text-2xs px-2.5 py-1 rounded-lg border bg-accent-blue-dim border-accent-blue/20 text-accent-blue hover:bg-accent-blue/20 transition-colors"
          >
            {claimingFaucet ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Droplets size={10} />
            )}
            {claimingFaucet ? "Claiming..." : "Get 10 USDC testnet"}
          </button>
        )}

        {/* Connected address */}
        <div className="hidden sm:flex items-center gap-1.5 bg-surface-2 border border-border-subtle rounded-lg px-3 py-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-green" />
          <span className="text-2xs font-mono text-text-secondary">{shortAddress}</span>
          <button
            onClick={copyAddress}
            className="p-0.5 hover:bg-surface-3 rounded transition-colors"
            title="Copy address"
          >
            {copied ? (
              <Check size={10} className="text-accent-green" />
            ) : (
              <Copy size={10} className="text-text-muted" />
            )}
          </button>
        </div>

        {/* Disconnect */}
        <button
          onClick={handleDisconnect}
          className="p-2 hover:bg-surface-3 rounded-lg transition-colors"
          title="Disconnect wallet"
        >
          <LogOut size={14} className="text-text-muted" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={connecting}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
        "bg-accent-green/10 border border-accent-green/20 text-accent-green hover:bg-accent-green/20",
        connecting && "opacity-70 cursor-wait"
      )}
    >
      {connecting ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <Wallet size={13} />
      )}
      {connecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
