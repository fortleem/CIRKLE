"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Briefcase, Users, FileText, Clock, Download, Shield, Plus } from "lucide-react";
import { toast } from "sonner";
import { FeedbackButton } from "@/components/ui/feedback-button";

interface Workspace {
  id: string;
  name: string;
  domain: string;
  members: number;
  rooms: number;
  role: "owner" | "admin" | "member";
}

interface AuditEntry {
  action: string;
  user: string;
  timestamp: string;
}

const DEMO_WORKSPACES: Workspace[] = [
  { id: "w1", name: "Jozour Engineering", domain: "jozour-egypt.com", members: 142, rooms: 23, role: "admin" },
  { id: "w2", name: "Cairo University — CS Dept", domain: "cu.edu.eg", members: 380, rooms: 15, role: "member" },
];

const DEMO_AUDIT: AuditEntry[] = [
  { action: "Joined room #engineering", user: "ahmed@jozour", timestamp: "2h ago" },
  { action: "Created room #design-review", user: "sara@jozour", timestamp: "5h ago" },
  { action: "Set retention 90d for #general", user: "admin@jozour", timestamp: "1d ago" },
  { action: "Exported room #engineering", user: "admin@jozour", timestamp: "2d ago" },
];

export function WorkMode({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [activeWs, setActiveWs] = useState<Workspace | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>(DEMO_AUDIT);
  const [showCreate, setShowCreate] = useState(false);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[140] bg-charcoal/70 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ stiffness: 240, damping: 26 }}
          className="fixed inset-x-0 bottom-0 sm:inset-x-auto sm:right-4 sm:top-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-2xl z-[150]"
          onClick={(e) => e.stopPropagation()}>
          <div className="glass-strong rounded-t-3xl sm:rounded-3xl shadow-float max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 glass-strong z-10 px-6 py-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-charcoal" />
                </div>
                <div>
                  <h2 className="font-display text-xl">Wasl Maktab — Work Mode</h2>
                  <p className="text-xs text-muted-foreground">Self-hosted workspaces · Blueprint §6.4</p>
                </div>
              </div>
              <FeedbackButton overlayName="Work Mode" />
              <button onClick={onClose} className="min-w-[44px] min-h-[44px] rounded-full hover:bg-muted/60 flex items-center justify-center" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {!activeWs ? (
                <>
                  {/* Workspace list */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-muted-foreground">Your Workspaces</h3>
                    <button onClick={() => setShowCreate(!showCreate)} className="text-xs px-3 py-1.5 rounded-full bg-primary/15 text-primary hover:bg-primary/25 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Create
                    </button>
                  </div>

                  {showCreate && (
                    <div className="glass rounded-xl p-4 space-y-3">
                      <input placeholder="Workspace name (e.g., Acme Corp)" className="w-full glass rounded-lg px-3 py-2 text-sm outline-none" />
                      <input placeholder="Domain (e.g., acme.com)" className="w-full glass rounded-lg px-3 py-2 text-sm outline-none" />
                      <button onClick={() => { toast.success("Workspace created", { description: "Share the join link with your team" }); setShowCreate(false); }}
                        className="w-full bg-gradient-gold text-charcoal rounded-lg py-2 text-sm font-medium">
                        Create Workspace
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    {DEMO_WORKSPACES.map(ws => (
                      <button key={ws.id} onClick={() => setActiveWs(ws)}
                        className="w-full glass rounded-xl p-4 text-left hover:bg-muted/40 transition">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{ws.name}</div>
                            <div className="text-xs text-muted-foreground">@{ws.domain}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">{ws.members} members · {ws.rooms} rooms</div>
                            <div className="text-[10px] text-secondary capitalize">{ws.role}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Workspace detail */}
                  <div className="flex items-center justify-between">
                    <button onClick={() => setActiveWs(null)} className="text-sm text-secondary hover:underline">← Back</button>
                    <span className="text-xs text-muted-foreground capitalize">{activeWs.role}</span>
                  </div>
                  <h3 className="font-display text-lg">{activeWs.name}</h3>

                  {/* Admin tools */}
                  {activeWs.role === "admin" || activeWs.role === "owner" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => toast.success("Invite sent", { description: "User added to workspace" })}
                        className="glass rounded-xl p-4 text-center hover:bg-muted/40">
                        <Users className="w-6 h-6 mx-auto mb-2 text-secondary" />
                        <div className="text-sm font-medium">Invite member</div>
                        <div className="text-[10px] text-muted-foreground">/invite command</div>
                      </button>
                      <button onClick={() => toast.success("Audit log exported", { description: "JSON file downloaded" })}
                        className="glass rounded-xl p-4 text-center hover:bg-muted/40">
                        <Download className="w-6 h-6 mx-auto mb-2 text-secondary" />
                        <div className="text-sm font-medium">Export audit log</div>
                        <div className="text-[10px] text-muted-foreground">/audit-log command</div>
                      </button>
                      <button onClick={() => toast.success("Retention set", { description: "Messages auto-delete after 90 days" })}
                        className="glass rounded-xl p-4 text-center hover:bg-muted/40">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-secondary" />
                        <div className="text-sm font-medium">Set retention</div>
                        <div className="text-[10px] text-muted-foreground">/set-retention 90d</div>
                      </button>
                      <button onClick={() => toast.success("Room exported", { description: "All messages downloaded as JSON" })}
                        className="glass rounded-xl p-4 text-center hover:bg-muted/40">
                        <FileText className="w-6 h-6 mx-auto mb-2 text-secondary" />
                        <div className="text-sm font-medium">Export room</div>
                        <div className="text-[10px] text-muted-foreground">/export-room</div>
                      </button>
                    </div>
                  ) : (
                    <div className="glass rounded-xl p-4 text-center text-sm text-muted-foreground">
                      <Shield className="w-6 h-6 mx-auto mb-2" />
                      You're a member. Ask an admin for elevated access.
                    </div>
                  )}

                  {/* Audit log */}
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Recent Activity</h4>
                    <div className="space-y-2">
                      {audit.map((entry, i) => (
                        <div key={i} className="glass rounded-lg p-3 flex items-center justify-between text-sm">
                          <div>
                            <span className="font-mono text-xs text-secondary">{entry.user}</span>
                            <p className="text-sm">{entry.action}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{entry.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Info */}
              <div className="glass rounded-xl p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Wasl Maktab features:</p>
                <p>• Self-hosted Matrix environment for companies and schools</p>
                <p>• Admin bot commands: /invite, /audit-log, /set-retention, /export-room</p>
                <p>• Department-based rooms with visibility + retention rules</p>
                <p>• Zero cost — organizations self-host on $5/month VPS</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
