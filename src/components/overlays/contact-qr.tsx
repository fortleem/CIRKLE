"use client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Download } from "lucide-react";
import { CircleMark } from "@/components/brand/circle-mark";
import { toast } from "sonner";
interface Props { open: boolean; onClose: () => void; username: string; displayName: string; }
export function ContactQR({ open, onClose, username, displayName }: Props) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(`cirkle://add/@${username}`)}&bgcolor=ffffff&color=1a1a15&margin=10`;
  return (
    <AnimatePresence>{open && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] bg-background flex items-center justify-center">
        <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-full hover:bg-muted/60 flex items-center justify-center z-10" aria-label="Close"><X className="w-5 h-5" /></button>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative glass-strong rounded-3xl p-8 max-w-sm w-full mx-6 text-center border border-border/40">
          <div className="flex flex-col items-center gap-4">
            <CircleMark size={48} />
            <div><h2 className="font-display text-2xl">{displayName}</h2><p className="text-sm text-secondary">@{username}</p></div>
            <div className="bg-white rounded-2xl p-4 shadow-glow"><img src={qrUrl} alt="QR" width={240} height={240} className="rounded-xl" /></div>
            <p className="text-xs text-muted-foreground">Scan to add me on Cirkle</p>
            <div className="flex gap-2 w-full">
              <button onClick={() => { navigator.clipboard?.writeText(`https://cirkle.space-z.ai/@${username}`); toast.success("Link copied!"); }} className="flex-1 py-2.5 rounded-full glass text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-muted/40 transition"><Share2 className="w-3.5 h-3.5" /> Share</button>
              <button onClick={() => toast.success("QR saved")} className="flex-1 py-2.5 rounded-full bg-gradient-gold text-charcoal text-xs font-medium flex items-center justify-center gap-1.5 hover:scale-105 transition"><Download className="w-3.5 h-3.5" /> Save</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    )}</AnimatePresence>
  );
}
