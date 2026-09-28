export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";

export interface ClassificationResult {
  severity: SeverityLevel;
  cveIds: string[];
  tags: string[];
}

const CVE_REGEX = /\bCVE-\d{4}-\d{4,7}\b/gi;

const TAG_RULES: Array<{ tag: string; keywords: RegExp }> = [
  {
    tag: "Zero-Day",
    keywords: /\b(zero[- ]day|0[- ]day|d[ií]a cero|actively exploited|explotad[oa] activamente|in[- ]the[- ]wild)\b/i,
  },
  {
    tag: "Ransomware",
    keywords: /\b(ransomware|lockbit|blackcat|alphv|clop|akira|ransomhub|extorsi[oó]n|secuestro de datos)\b/i,
  },
  {
    tag: "Data Breach",
    keywords: /\b(data breach|breach|leaked|data leak|filtraci[oó]n|datos filtrados|robo de datos|exfiltra\w+|exposed records)\b/i,
  },
  {
    tag: "Malware",
    keywords: /\b(malware|trojan|troyano|stealer|infostealer|botnet|backdoor|puerta trasera|spyware|rootkit|loader|rat\b)\b/i,
  },
  {
    tag: "Vulnerability",
    keywords: /\b(vulnerability|vulnerabilidad|vulnerabilidades|rce|remote code execution|ejeuci[oó]n remota|sql injection|xss|privilege escalation|bypass|buffer overflow|cvss)\b/i,
  },
  {
    tag: "Patch / Advisory",
    keywords: /\b(patch|patched|parche|actualizaci[oó]n de seguridad|security update|advisory|aviso de seguridad|cisa|incibe|fixes|mitigation)\b/i,
  },
  {
    tag: "Phishing",
    keywords: /\b(phishing|smishing|quishing|credential harvesting|suplantaci[oó]n|social engineering|ingenier[ií]a social|scam|estafa)\b/i,
  },
  {
    tag: "APT / Threat Intel",
    keywords: /\b(apt\d*|lazarus|sandworm|volt typhoon|salt typhoon|state[- ]sponsored|nation[- ]state|espionaje|ciberespionaje|threat actor|actor de amenazas)\b/i,
  },
  {
    tag: "Cloud & AI",
    keywords: /\b(cloud|aws|azure|kubernetes|docker|container|llm|artificial intelligence|inteligencia artificial|genai|api security)\b/i,
  },
];

const CRITICAL_REGEX =
  /\b(zero[- ]day|0[- ]day|d[ií]a cero|actively exploited|explotad[oa] activamente|rce|remote code execution|critical vulnerability|vulnerabilidad cr[ií]tica|cvss 9\.|cvss 10|unauthenticated rce)\b/i;

const HIGH_REGEX =
  /\b(ransomware|data breach|filtraci[oó]n|backdoor|puerta trasera|apt\d*|botnet|stealer|privilege escalation|high[- ]severity|alta gravedad|ciberataque|cyberattack)\b/i;

const MEDIUM_REGEX =
  /\b(vulnerability|vulnerabilidad|patch|parche|phishing|malware|advisory|aviso|flaw|fallo de seguridad|ddos)\b/i;

export function classifyArticle(
  title: string,
  summary: string = ""
): ClassificationResult {
  const combined = `${title} ${summary}`;

  // Extract unique CVE IDs
  const matches = combined.match(CVE_REGEX) || [];
  const cveIds = Array.from(new Set(matches.map((m) => m.toUpperCase())));

  // Determine tags
  const tags: string[] = [];
  for (const rule of TAG_RULES) {
    if (rule.keywords.test(combined)) {
      tags.push(rule.tag);
    }
  }

  if (cveIds.length > 0 && !tags.includes("Vulnerability")) {
    tags.push("Vulnerability");
  }

  if (tags.length === 0) {
    tags.push("Cyber News");
  }

  // Determine severity
  let severity: SeverityLevel = "INFO";
  if (CRITICAL_REGEX.test(combined) || (cveIds.length > 0 && /critical|cr[ií]tic[oa]|rce|zero[- ]day/i.test(combined))) {
    severity = "CRITICAL";
  } else if (HIGH_REGEX.test(combined) || cveIds.length > 0) {
    severity = "HIGH";
  } else if (MEDIUM_REGEX.test(combined)) {
    severity = "MEDIUM";
  }

  return {
    severity,
    cveIds: cveIds.slice(0, 6),
    tags: tags.slice(0, 4),
  };
}

export function stripHtml(raw: string = ""): string {
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/gi, "'")
    .replace(/&#8217;/gi, "'")
    .replace(/&#8220;|&#8221;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}
