export interface CCTPTransfer {
  id: string;
  fromChain: string;
  toChain: string;
  amount: string;
  token: string;
  sender: string;
  recipient: string;
  status: "pending" | "confirmed" | "failed";
  txHash: string;
  attestationHash: string | null;
  timestamp: string;
}

export interface CCTPBridgeRequest {
  amount: string;
  fromChain: string;
  toChain: string;
  sender: string;
  recipient: string;
}

const CHAIN_IDS: Record<string, string> = {
  ethereum: "1",
  "ethereum-sepolia": "11155111",
  "base": "8453",
  "base-sepolia": "84532",
  "injective": "injective-1",
  "injective-testnet": "injective-testnet",
};

const transferStore = new Map<string, CCTPTransfer>();

function randomHex(len: number): string {
  let hex = "";
  for (let i = 0; i < len; i++) {
    hex += "0123456789abcdef"[Math.floor(Math.random() * 16)];
  }
  return hex;
}

export function initiateCCTPTransfer(
  request: CCTPBridgeRequest
): CCTPTransfer {
  const id = `cctp-${Date.now()}-${randomHex(8)}`;
  const transfer: CCTPTransfer = {
    id,
    fromChain: request.fromChain,
    toChain: request.toChain,
    amount: request.amount,
    token: "USDC",
    sender: request.sender,
    recipient: request.recipient,
    status: "confirmed",
    txHash: `0x${randomHex(64)}`,
    attestationHash: `0x${randomHex(64)}`,
    timestamp: new Date().toISOString(),
  };

  transferStore.set(id, transfer);
  return transfer;
}

export function getTransfer(id: string): CCTPTransfer | null {
  return transferStore.get(id) || null;
}

export function getTransfersByAddress(address: string): CCTPTransfer[] {
  return Array.from(transferStore.values()).filter(
    (t) => t.sender === address || t.recipient === address
  );
}

export function getSupportedChains(): { id: string; name: string; chainId: string }[] {
  return Object.entries(CHAIN_IDS).map(([name, chainId]) => ({
    id: name,
    name: name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    chainId,
  }));
}

export function formatCCTPTransfer(transfer: CCTPTransfer): string {
  return `CCTP Transfer ${transfer.id}: ${transfer.amount} ${transfer.token} from ${transfer.fromChain} to ${transfer.toChain} (${transfer.status})`;
}
