"use client";

import { useState } from "react";
import { X, CreditCard, Loader2, Check, ArrowRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface X402PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSimulated: () => void;
  reportType: string;
  reportTitle: string;
  paymentInfo: {
    amount: string;
    token: string;
    chain: string;
    networkId: string;
    endpoint: string;
  };
}

export function X402PaymentModal({
  isOpen,
  onClose,
  onPaymentSimulated,
  reportType,
  reportTitle,
  paymentInfo,
}: X402PaymentModalProps) {
  const [phase, setPhase] = useState<"instructions" | "paying" | "done">("instructions");

  if (!isOpen) return null;

  const handleSimulatePayment = async () => {
    setPhase("paying");
    // Simulate payment delay
    await new Promise((r) => setTimeout(r, 1500));
    setPhase("done");
    await new Promise((r) => setTimeout(r, 800));
    onPaymentSimulated();
    setPhase("instructions");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-surface-1 border border-border-subtle rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent-yellow-dim flex items-center justify-center">
              <CreditCard size={15} className="text-accent-yellow" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">x402 Payment Required</h2>
              <p className="text-2xs text-text-muted">Protocol v1 — USDC micropayment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-3 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={14} className="text-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {phase === "instructions" && (
            <>
              {/* Report info */}
              <div className="bg-surface-2 border border-border-subtle rounded-lg p-3 mb-4">
                <div className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-1">
                  Unlocking
                </div>
                <div className="text-sm font-medium text-text-primary">{reportTitle}</div>
              </div>

              {/* Payment details */}
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Amount</span>
                  <span className="text-sm font-mono font-semibold text-accent-green">{paymentInfo.amount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Token</span>
                  <span className="text-xs font-mono text-text-secondary">{paymentInfo.token}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Chain</span>
                  <span className="text-xs font-mono text-text-secondary">{paymentInfo.chain}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Endpoint</span>
                  <span className="text-xs font-mono text-text-secondary truncate ml-4">{paymentInfo.endpoint}</span>
                </div>
              </div>

              {/* Protocol flow */}
              <div className="bg-surface-2 rounded-lg p-3 mb-4">
                <div className="text-2xs text-text-muted uppercase tracking-wider font-medium mb-2">
                  How x402 works
                </div>
                <div className="space-y-1.5">
                  {[
                    { step: "1", text: "Server returns HTTP 402 with payment instructions" },
                    { step: "2", text: "Client sends USDC to the payment endpoint" },
                    { step: "3", text: "Client includes payment proof in X-PAYMENT header" },
                    { step: "4", text: "Server verifies proof and serves premium content" },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-accent-blue-dim flex items-center justify-center text-2xs font-mono font-bold text-accent-blue shrink-0 mt-0.5">
                        {step}
                      </span>
                      <span className="text-2xs text-text-secondary leading-relaxed">{text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href="https://x402.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-2xs text-accent-blue hover:underline mb-4"
              >
                Learn more about x402 protocol
                <ExternalLink size={10} />
              </a>
            </>
          )}

          {phase === "paying" && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 rounded-full bg-accent-yellow-dim flex items-center justify-center mb-4">
                <Loader2 size={20} className="text-accent-yellow animate-spin" />
              </div>
              <p className="text-sm font-medium text-text-primary">Processing payment...</p>
              <p className="text-2xs text-text-muted mt-1">
                Sending {paymentInfo.amount} on {paymentInfo.chain}
              </p>
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center py-8">
              <div className="w-12 h-12 rounded-full bg-accent-green-dim flex items-center justify-center mb-4">
                <Check size={20} className="text-accent-green" />
              </div>
              <p className="text-sm font-medium text-text-primary">Payment confirmed</p>
              <p className="text-2xs text-text-muted mt-1">x402 proof generated — unlocking report...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {phase === "instructions" && (
          <div className="px-5 py-4 border-t border-border-subtle bg-surface-2/50">
            <button
              onClick={handleSimulatePayment}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-accent-green text-black text-sm font-semibold hover:bg-accent-green/90 transition-colors cursor-pointer"
            >
              <CreditCard size={14} />
              Simulate Payment
              <ArrowRight size={14} />
            </button>
            <p className="text-2xs text-text-muted text-center mt-2">
              Demo mode — no real USDC is transferred
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
