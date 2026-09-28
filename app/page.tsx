"use client";

import { useState, useCallback } from "react";
import type { RequirementsSchema } from "@/lib/extraction";
import { calculateQuote, formatSen } from "@/lib/pricing";
import type { QuoteResult } from "@/lib/pricing";
import { buildMalayReply, buildEnglishReply } from "@/lib/reply";
import { CATALOGUE, PRINT_OPTIONS } from "@/lib/catalogue";
import {
  SAMPLE_ENQUIRY_TEXT,
  SAMPLE_EXTRACTION,
  isSampleText,
} from "@/lib/samples";

type Mode = "idle" | "sample" | "live";
type Lang = "malay" | "english";
type Status = "idle" | "loading" | "success" | "error";

const FIELD_LABELS: Record<string, string> = {
  sizes: "Sizes",
  artworkProvided: "Artwork confirmed",
  deadlineText: "Delivery date",
  frontPrinting: "Front printing",
  quantity: "Quantity",
  productId: "Product",
  location: "Delivery location",
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<Mode>("idle");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<RequirementsSchema | null>(null);
  const [lang, setLang] = useState<Lang>("malay");
  const [copied, setCopied] = useState(false);

  const [editQty, setEditQty] = useState<string>("");
  const [editProductId, setEditProductId] = useState<string>("");
  const [editFrontPrinting, setEditFrontPrinting] = useState<string>("");
  const [editDeliveryMethod, setEditDeliveryMethod] = useState<string>("");
  const [editLocation, setEditLocation] = useState<string>("");

  function mergedRequirements(): RequirementsSchema | null {
    if (!requirements) return null;
    const parsedQty = editQty !== "" ? parseInt(editQty, 10) : null;
    const qty: number | null = parsedQty !== null ? parsedQty : requirements.quantity;
    const productId = editProductId !== "" ? editProductId || null : requirements.productId;
    const fp =
      editFrontPrinting === "true" ? true
      : editFrontPrinting === "false" ? false
      : editFrontPrinting === "null" ? null
      : requirements.frontPrinting;
    const dm = editDeliveryMethod !== ""
      ? (editDeliveryMethod as RequirementsSchema["deliveryMethod"])
      : requirements.deliveryMethod;
    const loc = editLocation !== "" ? editLocation || null : requirements.location;

    return {
      ...requirements,
      quantity: qty !== null && Number.isFinite(qty) && qty > 0 ? qty : null,
      productId,
      frontPrinting: fp,
      deliveryMethod: dm,
      location: loc,
    };
  }

  const merged = mergedRequirements();
  const quote: QuoteResult | null = merged ? calculateQuote(merged) : null;
  const reply = merged && quote
    ? lang === "malay" ? buildMalayReply(merged, quote) : buildEnglishReply(merged, quote)
    : null;

  const loadSample = useCallback(() => {
    setMessage(SAMPLE_ENQUIRY_TEXT);
    setRequirements(SAMPLE_EXTRACTION);
    setEditQty(String(SAMPLE_EXTRACTION.quantity ?? ""));
    setEditProductId(SAMPLE_EXTRACTION.productId ?? "");
    setEditFrontPrinting(SAMPLE_EXTRACTION.frontPrinting === null ? "null" : String(SAMPLE_EXTRACTION.frontPrinting));
    setEditDeliveryMethod(SAMPLE_EXTRACTION.deliveryMethod);
    setEditLocation(SAMPLE_EXTRACTION.location ?? "");
    setMode("sample");
    setStatus("success");
    setError(null);
  }, []);

  const extractRequirements = useCallback(async () => {
    if (!message.trim()) return;
    if (isSampleText(message)) { loadSample(); return; }

    setStatus("loading");
    setError(null);
    setRequirements(null);
    setMode("idle");

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? `Extraction failed (${res.status}).${data.requiredVars ? ` Configure: ${data.requiredVars.join(", ")}` : ""}`);
        setStatus("error");
        return;
      }
      const req: RequirementsSchema = data.requirements;
      setRequirements(req);
      setEditQty(String(req.quantity ?? ""));
      setEditProductId(req.productId ?? "");
      setEditFrontPrinting(req.frontPrinting === null ? "null" : String(req.frontPrinting));
      setEditDeliveryMethod(req.deliveryMethod);
      setEditLocation(req.location ?? "");
      setMode("live");
      setStatus("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Please retry.");
      setStatus("error");
    }
  }, [message, loadSample]);

  const handleCopy = useCallback(() => {
    if (!reply) return;
    navigator.clipboard.writeText(reply).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [reply]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* ── TOP NAV ── */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "var(--accent)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
          }}>Q</span>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px", color: "var(--text-primary)" }}>QuoteLah</span>
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 4 }}>T-shirt printing · quotation tool</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {mode !== "idle" && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
              padding: "3px 8px",
              borderRadius: 20,
              background: mode === "sample" ? "var(--warning-bg)" : "var(--accent-light)",
              color: mode === "sample" ? "var(--warning-text)" : "var(--accent-dark)",
              border: `1px solid ${mode === "sample" ? "var(--warning-border)" : "var(--accent-light)"}`,
            }}>
              {mode === "sample" ? "SAMPLE MODE" : "LIVE AI"}
            </span>
          )}
        </div>
      </header>

      {/* ── MAIN LAYOUT ── */}
      <main style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "380px 1fr",
        gap: 0,
        maxWidth: 1280,
        width: "100%",
        margin: "0 auto",
        alignItems: "start",
      }}>

        {/* ── LEFT SIDEBAR ── */}
        <aside style={{
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          minHeight: "calc(100vh - 56px)",
          padding: "20px 20px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}>
          <div>
            <label style={labelStyle} htmlFor="msg">Customer message</label>
            <textarea
              id="msg"
              style={{
                width: "100%",
                minHeight: 130,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "10px 12px",
                fontSize: 13.5,
                lineHeight: 1.65,
                resize: "vertical",
                outline: "none",
                color: "var(--text-primary)",
                background: status === "loading" ? "var(--surface-raised)" : "var(--surface)",
                transition: "border-color 0.15s",
              }}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (status === "success") {
                  setStatus("idle"); setRequirements(null); setMode("idle"); setError(null);
                }
              }}
              placeholder="Paste the customer's enquiry here…"
              rows={6}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnSecondaryStyle} onClick={loadSample}>Load sample</button>
            <button
              style={{
                ...btnPrimaryStyle,
                opacity: status === "loading" || !message.trim() ? 0.5 : 1,
                cursor: status === "loading" || !message.trim() ? "not-allowed" : "pointer",
              }}
              onClick={extractRequirements}
              disabled={status === "loading" || !message.trim()}
            >
              {status === "loading" ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, border: "2px solid #fff4", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  Extracting
                </span>
              ) : "Extract requirements"}
            </button>
          </div>

          {/* Error box */}
          {status === "error" && error && (
            <div style={{
              background: "var(--error-bg)",
              border: "1px solid var(--error-border)",
              borderRadius: "var(--radius-md)",
              padding: "12px 14px",
              fontSize: 13,
              color: "var(--error-text)",
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Extraction failed</div>
              <div style={{ marginBottom: 10, lineHeight: 1.5 }}>{error}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={btnSecondarySmallStyle} onClick={extractRequirements}>Retry</button>
                <button style={btnSecondarySmallStyle} onClick={loadSample}>Load sample</button>
              </div>
            </div>
          )}

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 10 }}>
              Sample catalogue
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5 }}>
              Simplified demo prices — not market claims. Owner confirms all orders.
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {CATALOGUE.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "5px 0", color: "var(--text-secondary)" }}>{item.name}</td>
                    <td style={{ padding: "5px 0", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                      {formatSen(item.unitPriceSen)}/unit
                    </td>
                  </tr>
                ))}
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "5px 0", color: "var(--text-secondary)" }}>{PRINT_OPTIONS.FRONT_PRINT.name}</td>
                  <td style={{ padding: "5px 0", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                    {formatSen(PRINT_OPTIONS.FRONT_PRINT.perUnitSen)}/shirt
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "5px 0", color: "var(--text-secondary)" }}>Delivery to Puchong</td>
                  <td style={{ padding: "5px 0", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>
                    RM20.00/order
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </aside>

        {/* ── RIGHT CONTENT ── */}
        <section style={{ padding: "20px 24px 40px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Empty state */}
          {status === "idle" && !requirements && (
            <div style={{
              marginTop: 40,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              color: "var(--text-muted)",
              textAlign: "center",
              padding: "48px 24px",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface)",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-secondary)", marginBottom: 4 }}>No enquiry loaded</div>
                <div style={{ fontSize: 13 }}>Paste a customer message and click <strong style={{ color: "var(--text-primary)" }}>Extract requirements</strong>, or load the sample.</div>
              </div>
            </div>
          )}

          {status === "loading" && (
            <div style={{
              marginTop: 40,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              color: "var(--text-muted)",
              padding: "48px 24px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface)",
            }}>
              <div style={{ width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Extracting requirements from message…</span>
            </div>
          )}

          {merged && quote && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

              {/* Requirements card */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>Requirements</span>
                  {mode === "sample" && <span style={sampleBadgeStyle}>SAMPLE DATA</span>}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <FieldRow label="Product">
                    <select style={selectStyle} value={editProductId} onChange={(e) => setEditProductId(e.target.value)}>
                      <option value="">— Unknown —</option>
                      {CATALOGUE.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </FieldRow>
                  <FieldRow label="Quantity">
                    <input style={inputStyle} type="number" min={1} step={1} value={editQty} onChange={(e) => setEditQty(e.target.value)} />
                  </FieldRow>
                  <FieldRow label="Colour">
                    <span style={fieldValueStyle}>{merged.colour ?? <span style={{ color: "var(--text-muted)" }}>—</span>}</span>
                  </FieldRow>
                  <FieldRow label="Front printing">
                    <select style={selectStyle} value={editFrontPrinting} onChange={(e) => setEditFrontPrinting(e.target.value)}>
                      <option value="null">— Not specified —</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="Delivery">
                    <select style={selectStyle} value={editDeliveryMethod} onChange={(e) => setEditDeliveryMethod(e.target.value)}>
                      <option value="unknown">— Unknown —</option>
                      <option value="delivery">Delivery</option>
                      <option value="collection">Self-collection</option>
                    </select>
                  </FieldRow>
                  <FieldRow label="Location">
                    <input style={{ ...inputStyle, width: 120 }} type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="e.g. Puchong" />
                  </FieldRow>
                  <FieldRow label="Deadline">
                    <span style={fieldValueStyle}>
                      {merged.deadlineText
                        ? <><span style={{ color: "var(--text-primary)" }}>&ldquo;{merged.deadlineText}&rdquo;</span><span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 4 }}>confirm exact date</span></>
                        : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </span>
                  </FieldRow>
                  <FieldRow label="Budget">
                    <span style={fieldValueStyle}>
                      {merged.budgetSen ? (
                        <span>
                          <span style={{ color: "var(--text-muted)", fontSize: 11, marginRight: 3 }}>
                            {merged.budgetComparison === "under" ? "Strictly under" : merged.budgetComparison === "atMost" ? "At most" : ""}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>{formatSen(merged.budgetSen)}</span>
                        </span>
                      ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </span>
                  </FieldRow>
                  <FieldRow label="Sizes">
                    <span style={fieldValueStyle}>
                      {merged.sizes && merged.sizes.length > 0
                        ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{merged.sizes.join(", ")}</span>
                        : <span style={{ color: "#d97706", fontSize: 12, fontWeight: 600 }}>Not specified</span>}
                    </span>
                  </FieldRow>
                  <FieldRow label="Artwork" last>
                    <span style={fieldValueStyle}>
                      {merged.artworkProvided === true ? "Provided"
                        : merged.artworkProvided === false ? "Not provided"
                        : <span style={{ color: "#d97706", fontSize: 12, fontWeight: 600 }}>Not confirmed</span>}
                    </span>
                  </FieldRow>
                </div>
              </div>

              {/* Quotation card */}
              <div style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={cardTitleStyle}>Quotation</span>
                  <span style={draftBadgeStyle}>DRAFT</span>
                </div>

                {quote.lineItems.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {quote.lineItems.map((item, i) => (
                      <div key={i} style={quoteRowStyle}>
                        <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13 }}>{formatSen(item.totalSen)}</span>
                      </div>
                    ))}
                    <div style={{ ...quoteRowStyle, color: "var(--text-muted)", fontSize: 12 }}>
                      <span>Subtotal</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{quote.subtotalSen !== null ? formatSen(quote.subtotalSen) : "—"}</span>
                    </div>
                    <div style={quoteRowStyle}>
                      <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{quote.deliveryLabel}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{quote.deliverySen !== null ? formatSen(quote.deliverySen) : <span style={{ color: "var(--text-muted)" }}>—</span>}</span>
                    </div>
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 10,
                      marginTop: 4,
                      borderTop: "2px solid var(--border)",
                    }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                      <span style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        fontSize: 22,
                        color: quote.totalSen !== null ? "var(--text-primary)" : "var(--text-muted)",
                        letterSpacing: "-0.5px",
                      }}>
                        {quote.totalSen !== null ? formatSen(quote.totalSen) : "Pending"}
                      </span>
                    </div>

                    {/* Budget badge */}
                    <div style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: 12,
                      fontWeight: 700,
                      textAlign: "center",
                      background: quote.budgetStatus === "within" ? "var(--success-bg)"
                        : quote.budgetStatus === "over" ? "var(--error-bg)"
                        : "var(--surface-raised)",
                      color: quote.budgetStatus === "within" ? "var(--success-text)"
                        : quote.budgetStatus === "over" ? "var(--error-text)"
                        : "var(--text-muted)",
                      border: `1px solid ${quote.budgetStatus === "within" ? "#bbf7d0"
                        : quote.budgetStatus === "over" ? "var(--error-border)"
                        : "var(--border)"}`,
                    }}>
                      {quote.budgetStatus === "within" ? "✓ Within budget"
                        : quote.budgetStatus === "over" ? "✗ Over budget"
                        : quote.budgetStatus === "pending" ? "Budget check pending"
                        : "Budget unknown"}
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "16px 0", color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6 }}>
                    {quote.warnings[0] ?? "Unable to calculate quote."}
                  </div>
                )}

                {/* Warnings */}
                {quote.warnings.length > 0 && (
                  <div style={{
                    marginTop: 8,
                    background: "var(--warning-bg)",
                    border: "1px solid var(--warning-border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--warning-text)",
                    lineHeight: 1.6,
                  }}>
                    {quote.warnings.map((w, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: i < quote.warnings.length - 1 ? 4 : 0 }}>
                        <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing fields */}
                {quote.missingFields.length > 0 && (
                  <div style={{
                    marginTop: 8,
                    background: "var(--error-bg)",
                    border: "1px solid var(--error-border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    fontSize: 12,
                    color: "var(--error-text)",
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Needs confirmation:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px" }}>
                      {quote.missingFields.map((f) => (
                        <span key={f} style={{
                          background: "#ffe4e6",
                          border: "1px solid var(--error-border)",
                          borderRadius: 4,
                          padding: "1px 7px",
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                        }}>{FIELD_LABELS[f] ?? f}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reply card — full width */}
              <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
                <div style={{ ...cardHeaderStyle, marginBottom: 10 }}>
                  <span style={cardTitleStyle}>Draft Reply</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <div style={{ display: "flex", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", overflow: "hidden" }}>
                      <button
                        style={{
                          ...langTabStyle,
                          background: lang === "malay" ? "var(--text-primary)" : "transparent",
                          color: lang === "malay" ? "#fff" : "var(--text-secondary)",
                        }}
                        onClick={() => setLang("malay")}
                      >Malay</button>
                      <button
                        style={{
                          ...langTabStyle,
                          borderLeft: "1px solid var(--border)",
                          background: lang === "english" ? "var(--text-primary)" : "transparent",
                          color: lang === "english" ? "#fff" : "var(--text-secondary)",
                        }}
                        onClick={() => setLang("english")}
                      >English</button>
                    </div>
                    <button
                      style={{
                        ...btnPrimaryStyle,
                        padding: "6px 14px",
                        fontSize: 12,
                        background: copied ? "var(--accent-dark)" : "var(--accent)",
                      }}
                      onClick={handleCopy}
                    >
                      {copied ? "✓ Copied" : "Copy reply"}
                    </button>
                  </div>
                </div>
                <pre style={{
                  margin: 0,
                  padding: "14px 16px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  lineHeight: 1.75,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontFamily: "var(--font-sans)",
                  color: "var(--text-primary)",
                  maxHeight: 280,
                  overflowY: "auto",
                }}>{reply}</pre>
              </div>

            </div>
          )}
        </section>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function FieldRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 0",
      borderBottom: last ? "none" : "1px solid var(--border-subtle)",
      minHeight: 34,
    }}>
      <span style={{
        fontWeight: 600,
        fontSize: 11.5,
        color: "var(--text-muted)",
        minWidth: 110,
        flexShrink: 0,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>{label}</span>
      <span style={{ flex: 1 }}>{children}</span>
    </div>
  );
}

/* ─── Style tokens ───────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-lg)",
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 4,
};

const cardTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "var(--text-primary)",
  letterSpacing: "-0.1px",
};

const sampleBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  background: "var(--warning-bg)",
  color: "var(--warning-text)",
  border: "1px solid var(--warning-border)",
  borderRadius: 4,
  padding: "2px 7px",
  letterSpacing: "0.06em",
};

const draftBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  fontFamily: "var(--font-mono)",
  background: "#f0f9ff",
  color: "#0369a1",
  border: "1px solid #bae6fd",
  borderRadius: 4,
  padding: "2px 7px",
  letterSpacing: "0.06em",
};

const quoteRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "5px 0",
  borderBottom: "1px solid var(--border-subtle)",
  fontSize: 13,
};

const fieldValueStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--text-primary)",
};

const btnPrimaryStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "-0.1px",
  transition: "background 0.15s",
};

const btnSecondaryStyle: React.CSSProperties = {
  background: "var(--surface)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
};

const btnSecondarySmallStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--error-text)",
  border: "1px solid var(--error-border)",
  borderRadius: "var(--radius-sm)",
  padding: "5px 10px",
  fontSize: 12,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "4px 8px",
  fontSize: 13,
  outline: "none",
  color: "var(--text-primary)",
  background: "var(--surface)",
  width: 80,
};

const selectStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "4px 6px",
  fontSize: 12.5,
  outline: "none",
  color: "var(--text-primary)",
  background: "var(--surface)",
  maxWidth: 180,
};

const langTabStyle: React.CSSProperties = {
  border: "none",
  padding: "5px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  transition: "background 0.1s, color 0.1s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "var(--text-muted)",
  marginBottom: 6,
};
