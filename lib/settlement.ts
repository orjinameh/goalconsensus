// Lazy-loaded settlement module — ethers is only loaded when functions are called,
// not at import time. This prevents the market routes from crashing if the
// blockchain provider is unavailable.

let _ethers: typeof import("ethers") | null = null;

async function loadEthers() {
  if (!_ethers) {
    _ethers = await import("ethers");
  }
  return _ethers;
}

const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const BASE_SEPOLIA_CHAIN_ID = 84532;
const USDC_ADDRESS = "0x036CbD53842c5426634c4923a9dFCA9f03Cc8540";
const USDC_DECIMALS = 6;
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export interface SettlementResult {
  success: boolean;
  txHash: string | null;
  blockNumber: number | null;
  from: string;
  to: string;
  amount: string;
  explorerUrl: string | null;
  error?: string;
}

function hasWalletKey(): boolean {
  return !!process.env.HOUSE_WALLET_PRIVATE_KEY;
}

export async function getHouseBalance(): Promise<{ address: string; eth: string; usdc: string } | null> {
  if (!hasWalletKey()) return null;

  try {
    const ethers = await loadEthers();
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.HOUSE_WALLET_PRIVATE_KEY!, provider);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);

    const [ethBalance, usdcBalance] = await Promise.all([
      provider.getBalance(wallet.address),
      usdc.balanceOf(wallet.address),
    ]);

    return {
      address: wallet.address,
      eth: ethers.formatEther(ethBalance),
      usdc: ethers.formatUnits(usdcBalance, USDC_DECIMALS),
    };
  } catch {
    return null;
  }
}

export async function transferUSDC(
  to: string,
  amountUsdc: number
): Promise<SettlementResult> {
  if (!hasWalletKey()) {
    // No wallet configured — return simulated result (not an error)
    return {
      success: false,
      txHash: null,
      blockNumber: null,
      from: "no-wallet",
      to,
      amount: amountUsdc.toFixed(2),
      explorerUrl: null,
      error: "HOUSE_WALLET_PRIVATE_KEY not configured — simulated settlement",
    };
  }

  try {
    const ethers = await loadEthers();
    const provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.HOUSE_WALLET_PRIVATE_KEY!, provider);
    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
    const amountRaw = ethers.parseUnits(amountUsdc.toFixed(2), USDC_DECIMALS);

    const balance = await usdc.balanceOf(wallet.address);
    if (balance < amountRaw) {
      return {
        success: false,
        txHash: null,
        blockNumber: null,
        from: wallet.address,
        to,
        amount: amountUsdc.toFixed(2),
        explorerUrl: null,
        error: `Insufficient USDC. Have ${ethers.formatUnits(balance, USDC_DECIMALS)}, need ${amountUsdc.toFixed(2)}`,
      };
    }

    const tx = await usdc.transfer(to, amountRaw);
    const receipt = await tx.wait();

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      from: wallet.address,
      to,
      amount: amountUsdc.toFixed(2),
      explorerUrl: `https://sepolia.basescan.org/tx/${receipt.hash}`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      txHash: null,
      blockNumber: null,
      from: "error",
      to,
      amount: amountUsdc.toFixed(2),
      explorerUrl: null,
      error: msg,
    };
  }
}

export { USDC_ADDRESS, BASE_SEPOLIA_CHAIN_ID };
