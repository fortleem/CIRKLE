"use client";
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (<div className="min-h-screen flex items-center justify-center bg-background p-5"><div className="max-w-md w-full rounded-2xl bg-card border border-border p-6 text-center"><div className="text-4xl mb-3">⚠️</div><h2 className="font-display text-xl mb-2">Something went wrong</h2><p className="text-sm text-muted-foreground mb-4">{error.message || "An unexpected error occurred."}</p><button onClick={reset} className="px-4 py-2 rounded-full bg-gradient-hero text-cream text-sm font-medium">Try again</button></div></div>);
}
