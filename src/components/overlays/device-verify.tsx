"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, QrCode, KeyRound, Check, Copy } from "lucide-react";
import { toast } from "sonner";

export function DeviceVerify({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [step, setStep] = useState<"intro" | "qr" | "verify" | "done">("intro");
  const [code, setCode] = useState("");

  // Generate a mock SAS (Short Authentication String) — 7 emojis like Signal
  const sasEmojis = ["🎉", "🌹", "🦊", "🌟", "🐙", "🌈", "🎸"];
  const sasHex = "A3F7B2E1C9D8F0A4";

  const startVerification = () => {
    setStep("qr");
  };

  const scanQR = () => {
    setStep("verify");
  };

  const confirmMatch = () => {
    setStep("done");
    toast.success("Device verified!", { description: "Encrypted communication confirmed" });
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] bg-charcoal/70 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ stiffness: 240, damping: 26 }}
          className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md z-[150]"
          onClick={(e) => e.stopPropagation()}>
          <div className="glass-strong rounded-t-3xl sm:rounded-3xl shadow-float max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 glass-strong z-10 px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-charcoal" />
                </div>
                <div>
                  <h2 className="font-display text-xl">Device Verification</h2>
                  <p className="text-xs text-muted-foreground">E2EE QR verification · Blueprint §6.8</p>
                </div>
              </div>
              <button onClick={onClose} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {step === "intro" && (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/15 flex items-center justify-center">
                    <KeyRound className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg">Verify your chat partner's device</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      End-to-end encryption is only secure if you verify that the device you're chatting with belongs to the right person.
                      Scan their QR code or compare the emoji sequence below.
                    </p>
                  </div>
                  <button onClick={startVerification}
                    className="w-full bg-gradient-gold text-charcoal font-medium rounded-xl py-3 flex items-center justify-center gap-2">
                    <QrCode className="w-4 h-4" /> Start Verification
                  </button>
                </div>
              )}

              {step === "qr" && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">Your verification QR code:</p>
                  {/* Mock QR code as a grid */}
                  <div className="w-48 h-48 mx-auto glass rounded-2xl p-4 flex items-center justify-center">
                    <div className="grid grid-cols-8 gap-0.5 w-full h-full">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div key={i} className={`rounded-sm ${Math.random() > 0.5 ? "bg-foreground" : "bg-transparent"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground break-all">{sasHex}</p>
                  <button onClick={scanQR}
                    className="w-full bg-gradient-gold text-charcoal font-medium rounded-xl py-3">
                    I've scanned their code
                  </button>
                </div>
              )}

              {step === "verify" && (
                <div className="text-center space-y-4">
                  <p className="text-sm text-muted-foreground">Compare these emojis with your partner. They should match exactly:</p>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {sasEmojis.map((emoji, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="w-14 h-14 glass rounded-2xl flex items-center justify-center text-3xl"
                      >
                        {emoji}
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">{sasHex}</p>
                  <div className="flex gap-2">
                    <button onClick={() => { toast.error("Verification cancelled"); onClose(); }}
                      className="flex-1 glass rounded-xl py-3 text-sm font-medium">
                      Don't match
                    </button>
                    <button onClick={confirmMatch}
                      className="flex-1 bg-gradient-gold text-charcoal font-medium rounded-xl py-3 text-sm">
                      They match!
                    </button>
                  </div>
                </div>
              )}

              {step === "done" && (
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center"
                  >
                    <Check className="w-10 h-10 text-green-500" />
                  </motion.div>
                  <div>
                    <h3 className="font-display text-lg">Verified!</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      This device is now verified. All future messages will show a verified badge.
                      Your communication is end-to-end encrypted with no backdoors.
                    </p>
                  </div>
                  <button onClick={onClose}
                    className="w-full bg-gradient-gold text-charcoal font-medium rounded-xl py-3">
                    Done
                  </button>
                </div>
              )}

              {/* Info */}
              <div className="glass rounded-xl p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">How E2EE verification works:</p>
                <p>• Olm (ratchet) for 1:1 chats, Megolm for groups</p>
                <p>• Keys generated and stored locally on your device</p>
                <p>• SAS (Short Authentication String) — 7 emojis to compare</p>
                <p>• No backdoors — Cirkle cannot decrypt messages even if compelled</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
