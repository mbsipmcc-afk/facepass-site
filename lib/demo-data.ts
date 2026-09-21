// Clearly-synthetic demo data for the dashboard section. No real people.
export const roster = [
  { id: "MP-0142", name: "A. Voss", initials: "AV", status: "active", tone: "verify" },
  { id: "MP-0187", name: "K. Osei", initials: "KO", status: "active", tone: "verify" },
  { id: "MP-0203", name: "M. Haddad", initials: "MH", status: "active", tone: "verify" },
  { id: "MP-0211", name: "J. Lindqvist", initials: "JL", status: "syncing", tone: "brand" },
  { id: "MP-0226", name: "R. Tanaka", initials: "RT", status: "active", tone: "verify" },
  { id: "MP-0234", name: "S. Okonkwo", initials: "SO", status: "enrolled", tone: "violet" },
  { id: "MP-0249", name: "D. Marchetti", initials: "DM", status: "active", tone: "verify" },
  { id: "MP-0255", name: "L. Novak", initials: "LN", status: "offline", tone: "amber" },
] as const;

export const attendance = [
  { time: "07:58:41", member: "MP-0142", name: "A. Voss", result: "VERIFIED", conf: "97%", latency: "3.1 s", sync: "synced" },
  { time: "07:59:07", member: "MP-0187", name: "K. Osei", result: "VERIFIED", conf: "96%", latency: "2.7 s", sync: "synced" },
  { time: "08:00:19", member: "MP-0211", name: "J. Lindqvist", result: "VERIFIED", conf: "95%", latency: "4.2 s", sync: "queued" },
  { time: "08:01:02", member: "MP-0203", name: "M. Haddad", result: "VERIFIED", conf: "98%", latency: "2.9 s", sync: "synced" },
  { time: "08:02:47", member: "N/A", name: "unknown subject", result: "REJECTED", conf: "8%", latency: "4.8 s", sync: "synced" },
  { time: "08:04:10", member: "MP-0226", name: "R. Tanaka", result: "VERIFIED", conf: "97%", latency: "3.4 s", sync: "synced" },
] as const;
