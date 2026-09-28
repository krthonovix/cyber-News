import { describe, it, expect } from "vitest";
import { classifyArticle, stripHtml } from "../classifier";

describe("classifyArticle", () => {
  it("extracts CVE IDs and marks critical zero-day exploits as CRITICAL", () => {
    const result = classifyArticle(
      "Critical Zero-Day Vulnerability Actively Exploited in Firewalls (CVE-2026-21440 & cve-2026-0099)",
      "Unauthenticated remote code execution flaw exploited in the wild."
    );

    expect(result.severity).toBe("CRITICAL");
    expect(result.cveIds).toContain("CVE-2026-21440");
    expect(result.cveIds).toContain("CVE-2026-0099");
    expect(result.tags).toContain("Zero-Day");
    expect(result.tags).toContain("Vulnerability");
  });

  it("classifies Spanish ransomware and data breach articles accurately", () => {
    const result = classifyArticle(
      "Nuevo ataque de Ransomware provoca filtración de datos masiva en servidores",
      "El grupo utilizó una vulnerabilidad conocida para exfiltrar archivos."
    );

    expect(result.severity).toBe("HIGH");
    expect(result.tags).toContain("Ransomware");
    expect(result.tags).toContain("Data Breach");
  });

  it("strips HTML tags cleanly from RSS descriptions", () => {
    const cleaned = stripHtml("<p>Alert: <b>CVE-2026-1111</b> &amp; patch released.</p>");
    expect(cleaned).toBe("Alert: CVE-2026-1111 & patch released.");
  });
});
