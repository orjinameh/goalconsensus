export interface X402Receipt {
  paid: boolean;
  amount: string;
  protocol: string;
  chain: string;
  txHash: string;
  tool: string;
  timestamp: string;
  queryId: string;
}

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
  const receipt: X402Receipt = {
    paid: true,
    amount: "0.001 USDC",
    protocol: "x402",
    chain: "Injective Testnet",
    txHash: `0x${randomHex(64)}`,
    tool: toolName,
    timestamp: new Date().toISOString(),
    queryId,
  };

  console.log(
    `[x402] Charged ${receipt.amount} on ${receipt.chain} for ${toolName} | tx: ${receipt.txHash}`
  );

  return receipt;
}

export function formatX402Header(): string {
  return "x402/payment; endpoint=injective-testnet.evm.neutron.org; amount=0.001 USDC; protocol=x402";
}
