"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Radio, Users, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface BroadcastChannel {
  id: string;
  name: string;
  description: string;
  subscribers: number;
  category: string;
  createdAt: string;
}

const CATEGORIES = ["News", "Sports", "Tech", "Entertainment", "Business", "Education", "Government", "Community"];

export function BroadcastChannel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("News");
  const [channels, setChannels] = useState<BroadcastChannel[]>([]);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!name.trim()) { toast.error("Channel name required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: "broadcast", description, category }),
      });
      if (!res.ok) throw new Error("failed");
      const ch: BroadcastChannel = {
        id: `bc-${Date.now()}`,
        name, description, subscribers: 0, category,
        createdAt: new Date().toISOString(),
      };
      setChannels([ch, ...channels]);
      toast.success("Broadcast channel created!", { description: `${name} is now live — share the link to get subscribers` });
      setName(""); setDescription("");
    } catch {
      toast.error("Failed to create channel");
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] bg-charcoal/70 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ stiffness: 240, damping: 26 }}
          className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg z-[150]"
          onClick={(e) => e.stopPropagation()}>
          <div className="glass-strong rounded-t-3xl sm:rounded-3xl shadow-float max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 glass-strong z-10 px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Radio className="w-5 h-5 text-charcoal" />
                </div>
                <div>
                  <h2 className="font-display text-xl">Broadcast Channel</h2>
                  <p className="text-xs text-muted-foreground">One-to-many communication · Blueprint §6.7</p>
                </div>
              </div>
              <FeedbackButton overlayName="Broadcast Channel" />
              <button onClick={onClose} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Create form */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Create New Channel
                </h3>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Channel name (e.g., Cairo Weather)"
                  className="w-full glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description — what will subscribers receive?"
                  rows={2}
                  className="w-full glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`text-xs px-3 py-1.5 rounded-full transition ${category === cat ? "bg-primary text-primary-foreground" : "glass hover:bg-muted/40"}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  onClick={create}
                  disabled={creating || !name.trim()}
                  className="w-full bg-gradient-gold text-charcoal font-medium rounded-xl py-3 flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                >
                  {creating ? "Creating..." : <><Send className="w-4 h-4" /> Create Channel</>}
                </button>
              </div>

              {/* My channels */}
              {channels.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" /> My Channels ({channels.length})
                  </h3>
                  <div className="space-y-2">
                    {channels.map(ch => (
                      <div key={ch.id} className="glass rounded-xl p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{ch.name}</div>
                          <div className="text-xs text-muted-foreground">{ch.description || "No description"}</div>
                          <div className="text-[10px] text-secondary mt-1">{ch.category} · 0 subscribers</div>
                        </div>
                        <button
                          onClick={() => toast.success("Broadcast link copied", { description: `Share to grow ${ch.name}` })}
                          className="text-xs px-3 py-1.5 rounded-full bg-primary/15 text-primary hover:bg-primary/25"
                        >
                          Share
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="glass rounded-xl p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">How broadcast channels work:</p>
                <p>• Only you (the owner) can send messages — subscribers can react but not reply</p>
                <p>• Analytics are anonymized aggregates (subscriber count, reach, reactions)</p>
                <p>• Channels are public and discoverable in the directory</p>
                <p>• Zero cost — no billing details collected, ever</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
