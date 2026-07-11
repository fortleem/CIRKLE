import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    stats: { activeCases: 12, resolvedCases: 847, witnessesOnline: 23, satisfaction: 94 },
    cases: [
      { id: "cs-1", number: "CS-2025-04812", category: "Police Misconduct", title: "Off-duty officer refused to file traffic report", status: "investigating", office: "Al-Olaya Traffic Police", officeRegion: "Riyadh", reputation: 62, timestamp: "2h ago", evidenceCount: 3, witnessCount: 2, privacyLevel: "protected", escalationLevel: 2, aiSummary: "Pattern matches 3 similar complaints at this office in Q2 2025.", chainOfCustody: [{ actor: "Citizen", role: "reporter", action: "Submitted incident with video evidence", ts: "14:32" },{ actor: "AI Shield", role: "system", action: "Hash verified + IPFS uploaded + routed to traffic dept", ts: "14:33" },{ actor: "Supervisor", role: "office", action: "Case acknowledged", ts: "15:01" }] },
      { id: "cs-2", number: "CS-2025-04799", category: "Passport Delays", title: "Renewal stuck 47 days beyond SLA", status: "escalated", office: "Diplomatic Quarter Passports", officeRegion: "Riyadh", reputation: 48, timestamp: "5h ago", evidenceCount: 7, witnessCount: 5, privacyLevel: "identified", escalationLevel: 3, aiSummary: "SLA breach confirmed. 12 similar cases at this office this month.", chainOfCustody: [{ actor: "Citizen", role: "reporter", action: "Submitted renewal delay report", ts: "10:15" }] },
      { id: "cs-3", number: "CS-2025-04785", category: "Municipal Services", title: "Streetlight outage on Al-Madarraj St", status: "resolved", office: "Arafat Municipality", officeRegion: "Riyadh", reputation: 81, timestamp: "Yesterday", evidenceCount: 5, witnessCount: 4, privacyLevel: "identified", escalationLevel: 1, aiSummary: "Resolved within 48h of report. Repair confirmed by witness.", chainOfCustody: [{ actor: "Citizen", role: "reporter", action: "Reported outage", ts: "09:00" }] },
      { id: "cs-4", number: "CS-2025-04771", category: "Healthcare", title: "Clinic refused emergency admission", status: "pending", office: "Al-Nakheel Primary Health Center", officeRegion: "Riyadh", reputation: 54, timestamp: "Yesterday", evidenceCount: 1, witnessCount: 2, privacyLevel: "protected", escalationLevel: 1, aiSummary: "Awaiting evidence review.", chainOfCustody: [{ actor: "Citizen", role: "reporter", action: "Submitted report", ts: "16:20" }] },
      { id: "cs-5", number: "CS-2025-04755", category: "Utility Billing", title: "Billing error — charged for unoccupied villa", status: "investigating", office: "SEC Customer Service — Al-Khobar", officeRegion: "Eastern Province", reputation: 71, timestamp: "2 days ago", evidenceCount: 0, witnessCount: 6, privacyLevel: "identified", escalationLevel: 2, aiSummary: "Meter reading anomaly detected. AI recommends on-site inspection.", chainOfCustody: [{ actor: "Citizen", role: "reporter", action: "Submitted billing dispute", ts: "11:45" }] },
      { id: "cs-6", number: "CS-2025-04740", category: "Traffic", title: "Traffic signal malfunction causing daily jams", status: "resolved", office: "Riyadh Traffic Department", officeRegion: "Riyadh", reputation: 76, timestamp: "3 days ago", evidenceCount: 4, witnessCount: 3, privacyLevel: "identified", escalationLevel: 1, aiSummary: "Signal repaired within 72h. Traffic flow restored.", chainOfCustody: [{ actor: "Citizen", role: "reporter", action: "Reported signal malfunction", ts: "08:30" }] },
    ],
    offices: [
      { id: "o1", name: "Al-Olaya Traffic Police", region: "Riyadh", category: "Police", reputation: 62, lat: 24.6921, lng: 46.6858, resolvedCases: 142, avgWaitTime: "18h" },
      { id: "o2", name: "Diplomatic Quarter Passports", region: "Riyadh", category: "Passports", reputation: 48, lat: 24.7020, lng: 46.6230, resolvedCases: 89, avgWaitTime: "12d" },
      { id: "o3", name: "Arafat Municipality", region: "Riyadh", category: "Municipal", reputation: 81, lat: 24.7136, lng: 46.6753, resolvedCases: 312, avgWaitTime: "36h" },
      { id: "o4", name: "Al-Nakheel Health Center", region: "Riyadh", category: "Healthcare", reputation: 54, lat: 24.7530, lng: 46.6280, resolvedCases: 67, avgWaitTime: "5d" },
      { id: "o5", name: "SEC Customer Service — Al-Khobar", region: "Eastern Province", category: "Utility", reputation: 71, lat: 26.2794, lng: 50.2083, resolvedCases: 198, avgWaitTime: "48h" },
      { id: "o6", name: "Riyadh Traffic Department", region: "Riyadh", category: "Traffic", reputation: 76, lat: 24.7100, lng: 46.7000, resolvedCases: 256, avgWaitTime: "72h" },
      { id: "o7", name: "Jeddah Municipality", region: "Makkah", category: "Municipal", reputation: 69, lat: 21.4858, lng: 39.1925, resolvedCases: 187, avgWaitTime: "52h" },
      { id: "o8", name: "Madinah Passport Office", region: "Madinah", category: "Passports", reputation: 73, lat: 24.4683, lng: 39.6142, resolvedCases: 145, avgWaitTime: "4d" },
    ],
    witnessRequests: [
      { id: "wr1", title: "Traffic signal malfunction at King Fahd Rd", distance: "0.8 km", time: "10m ago", needed: 2, confirmed: 1 },
      { id: "wr2", title: "Long queue at passport office — no AC", distance: "1.2 km", time: "25m ago", needed: 3, confirmed: 2 },
      { id: "wr3", title: "Pothole causing accidents on Salam St", distance: "2.1 km", time: "1h ago", needed: 2, confirmed: 0 },
      { id: "wr4", title: "Clinic overcharging for basic services", distance: "1.5 km", time: "2h ago", needed: 4, confirmed: 3 },
    ],
    predictiveAlerts: [
      { id: "pa1", severity: "high", title: "Passport office SLA breach trend", description: "47% SLA breach rate this month.", confidence: 92 },
      { id: "pa2", severity: "medium", title: "Traffic signal failures clustering", description: "3 signal malfunctions within 2km.", confidence: 78 },
      { id: "pa3", severity: "low", title: "Billing complaint spike", description: "2.3x normal billing complaints.", confidence: 65 },
    ],
    witnessProfile: { score: 87, level: "Trusted Witness", accuracy: 94, casesWitnessed: 23, badges: ["First Responder", "Truth Teller", "Community Guardian"] },
    publishedResolvedCases: 312,
  });
}
