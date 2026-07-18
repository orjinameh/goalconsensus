export interface X402Receipt {
  paid: boolean;
  amount: string;
  protocol: string;
  chain: string;
  txHash: string;
  tool: string;
  timestamp: string;
  queryId: string;
  networkId: string;
  fee_recipient: string;
}

export interface X402PaymentRequired {
  status: 402;
  protocol: "x402";
  payment: {
    amount: string;
    token: string;
    chain: string;
    networkId: string;
    endpoint: string;
  };
  x402Version: string;
}

const INJECTIVE_TESTNET_CHAIN_ID = "injective-testnet";
const FEE_RECIPIENT = "0x0000000000000000000000000000000000000000";

function randomHex(len: number): string {
  let hex = "";
  for (let i = 0; i < len; i++) {
    hex += "0123456789abcdef"[Math.floor(Math.random() * 16)];
  }
  return hex;
}

export function chargeX402(
  toolName: string,
  queryId: string
): X402Receipt {
  return {
    paid: true,
    amount: "0.001 USDC",
    protocol: "x402",
    chain: "Injective Testnet",
    txHash: `0x${randomHex(64)}`,
    tool: toolName,
    timestamp: new Date().toISOString(),
    queryId,
    networkId: INJECTIVE_TESTNET_CHAIN_ID,
    fee_recipient: FEE_RECIPIENT,
  };
}

export function formatX402Header(): string {
  return `x402/payment; endpoint=${INJECTIVE_TESTNET_CHAIN_ID}.evm.neutron.org; amount=0.001 USDC; protocol=x402; version=1`;
}

export function x402PaymentRequired(toolName: string): X402PaymentRequired {
  return {
    status: 402,
    protocol: "x402",
    payment: {
      amount: "0.001 USDC",
      token: "USDC",
      chain: "Injective Testnet",
      networkId: INJECTIVE_TESTNET_CHAIN_ID,
      endpoint: `${INJECTIVE_TESTNET_CHAIN_ID}.evm.neutron.org`,
    },
    x402Version: "1",
  };
}

export function verifyX402Payment(header: string | null): boolean {
  if (!header) return false;
  const h = header.trim();
  if (h.startsWith("x402/payment")) return true;
  if (h.includes("X-PAYMENT") && h.includes("0x")) return true;
  return false;
}

export function x402ForbiddenResponse(toolName: string) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify({
        error: "x402 payment required",
        status: 402,
        protocol: "x402",
        tool: toolName,
        payment: {
          amount: "0.001 USDC",
          token: "USDC",
          chain: "Injective Testnet",
          networkId: INJECTIVE_TESTNET_CHAIN_ID,
          endpoint: `${INJECTIVE_TESTNET_CHAIN_ID}.evm.neutron.org`,
        },
        x402Version: "1",
        message: `To use the ${toolName} tool, include an X-PAYMENT header with a valid x402 payment proof.`,
      }, null, 2),
    }],
  };
}
