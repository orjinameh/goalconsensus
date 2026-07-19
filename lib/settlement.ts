import { ethers } from "ethers";

const BASE_SEPOLIA_RPC = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const BASE_SEPOLIA_CHAIN_ID = 84532;

// USDC on Base Sepolia — canonical Circle-deployed contract
const USDC_ADDRESS = "0x036CbD53842c5426634c4923a9dFCA9f03Cc8540";
const USDC_DECIMALS = 6;

// Minimal ERC-20 ABI for transfer + balanceOf + decimals
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

let _provider: ethers.JsonRpcProvider | null = null;
let _houseWallet: ethers.Wallet | null = null;
let _usdcContract: ethers.Contract | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(BASE_SEPOLIA_RPC);
  }
  return _provider;
}

function getHouseWallet(): ethers.Wallet | null {
  if (_houseWallet) return _houseWallet;
  const key = process.env.HOUSE_WALLET_PRIVATE_KEY;
  if (!key) return null;
  _houseWallet = new ethers.Wallet(key, getProvider());
  return _houseWallet;
}

function getUsdcContract(signer?: ethers.Signer): ethers.Contract {
  const s = signer || getHouseWallet() || getProvider();
  if (!_usdcContract || signer) {
    return new ethers.Contract(USDC_ADDRESS, ERC20_ABI, s);
  }
  return _usdcContract;
}

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

export async function getHouseBalance(): Promise<{ address: string; eth: string; usdc: string } | null> {
  const wallet = getHouseWallet();
  if (!wallet) return null;

  const provider = getProvider();
  const ethBalance = await provider.getBalance(wallet.address);
  const usdc = getUsdcContract();
  const usdcBalance = await usdc.balanceOf(wallet.address);

  return {
    address: wallet.address,
    eth: ethers.formatEther(ethBalance),
    usdc: ethers.formatUnits(usdcBalance, USDC_DECIMALS),
  };
}

export async function transferUSDC(
  to: string,
  amountUsdc: number
): Promise<SettlementResult> {
  const wallet = getHouseWallet();
  if (!wallet) {
    return {
      success: false,
      txHash: null,
      blockNumber: null,
      from: "no-wallet",
      to,
      amount: amountUsdc.toFixed(2),
      explorerUrl: null,
      error: "HOUSE_WALLET_PRIVATE_KEY not configured",
    };
  }

  try {
    const usdc = getUsdcContract(wallet);
    const amountRaw = ethers.parseUnits(amountUsdc.toFixed(2), USDC_DECIMALS);

    // Check balance first
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
        error: `Insufficient USDC balance. Have ${ethers.formatUnits(balance, USDC_DECIMALS)}, need ${amountUsdc.toFixed(2)}`,
      };
    }

    const tx = await usdc.transfer(to, amountRaw);
    const receipt = await tx.wait();

    const explorerUrl = `https://sepolia.basescan.org/tx/${receipt.hash}`;

    return {
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      from: wallet.address,
      to,
      amount: amountUsdc.toFixed(2),
      explorerUrl,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      txHash: null,
      blockNumber: null,
      from: wallet.address,
      to,
      amount: amountUsdc.toFixed(2),
      explorerUrl: null,
      error: msg,
    };
  }
}

export async function getUSDCBalance(address: string): Promise<string> {
  const usdc = getUsdcContract();
  const balance = await usdc.balanceOf(address);
  return ethers.formatUnits(balance, USDC_DECIMALS);
}

export { USDC_ADDRESS, BASE_SEPOLIA_CHAIN_ID };
