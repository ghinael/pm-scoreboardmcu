import React, { useState, useEffect, useMemo } from "react";

// ─────────────────────────────────────────────────────────────
// CONFIG — paste URL publish-to-web CSV tab 90_EXPORT_DASHBOARD
// ─────────────────────────────────────────────────────────────
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSxeXQjctXiL9WBqxDHgb4GtMIcUgw2OkoD6xZFwkrfLhvUMAA-hUPTP5D8mrqMjNwAmowpkfzmtk19/pub?gid=1965086356&single=true&output=csv";
const FOTO_PM = "https://drive.google.com/thumbnail?id=1hHXUbp27jvg9fK05zYIlMneHAs1zAf7M&sz=w1600";

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const C = {
  bg: "#f0f2f5", white: "#ffffff", navy: "#16335c", navy2: "#1f4576",
  ink: "#1a1a2e", muted: "#6b7280", border: "#e5e7eb", light: "#f9fafb",
  green: "#10b981", greenBg: "#d1fae5", greenTxt: "#065f46",
  red: "#ef4444", redBg: "#fee2e2", redTxt: "#991b1b",
  orange: "#f59e0b", orangeBg: "#fef3c7", orangeTxt: "#92400e",
  blue: "#3b82f6", blueBg: "#dbeafe",
  teal: "#0d9488",
};
const PROG = {
  DBE: "#2563eb", MMBA: "#7c3aed", SIC: "#0891b2",
  DBS: "#ea580c", Brevet: "#16a34a", CCC: "#94a3b8",
};
const PROG_BG = {
  DBE: "#dbeafe", MMBA: "#ede9fe", SIC: "#cffafe",
  DBS: "#ffedd5", Brevet: "#dcfce7", CCC: "#f1f5f9",
};

// ─────────────────────────────────────────────────────────────
// CSV PARSING
// ─────────────────────────────────────────────────────────────
function parseCSV(text) {
  return text.split(/\r?\n/).map(r => {
    const out = []; let cur = ""; let q = false;
    for (let i = 0; i < r.length; i++) {
      const ch = r[i];
      if (ch === '"') { q = !q; continue; }
      if (ch === ',' && !q) { out.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur.trim());
    return out;
  });
}

function num(v) {
  if (v === null || v === undefined || v === "" || v === "—") return 0;
  let s = String(v).replace(/\s/g, "").replace(/%/g, "");
  s = s.replace(/\./g, "").replace(",", "."); // ID locale: 1.000.000,5 → 1000000.5
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function pct(v) {
  if (v === null || v === undefined || v === "" || v === "—") return 0;
  let s = String(v).trim();
  if (s.includes("%")) {
    let n = num(s);
    return Math.abs(n) > 1.5 ? n / 100 : n;
  }
  let n = num(s);
  return Math.abs(n) > 1.5 ? n / 100 : n;
}

function rp(v) {
  const n = num(v);
  if (n === 0) return "Rp 0";
  if (Math.abs(n) >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
  if (Math.abs(n) >= 1e6) return `Rp ${(n / 1e6).toFixed(0)}jt`;
  if (Math.abs(n) >= 1e3) return `Rp ${(n / 1e3).toFixed(0)}rb`;
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtPct(v) {
  const p = typeof v === "number" ? v : pct(v);
  if (p === 0) return "0%";
  return `${(p * 100).toFixed(0)}%`;
}

const SECTIONS = [
  "Header", "PERFORMA_TIM", "PAPAN_PERFORMA", "KALDIK_EVENTS",
  "CASHFLOW_BULAN", "TOP_COMMITMENT", "PESERTA_AKTIF_RINGKAS",
  "FOTO_TIM", "WEEKLY_LEADER", "PERFORMANCE_APPRAISAL",
];

function findSection(rows, label) {
  const idx = rows.findIndex(r => {
    const v = (r[0] || "").trim();
    return v === label || v.startsWith(label);
  });
  if (idx === -1) return [];
  const out = [];
  for (let i = idx + 2; i < rows.length; i++) {
    const r = rows[i] || [];
    const first = (r[0] || "").trim();
    if (SECTIONS.some(s => first === s || first.startsWith(s))) break;
    if (r.every(c => !c || c.trim() === "")) break;
    out.push(r);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
// DATA BUILDER
// ─────────────────────────────────────────────────────────────
function buildData(text) {
  const rows = parseCSV(text);

  // Header
  const hdr = {};
  rows.filter(r => (r[0] || "").trim() === "Header").forEach(r => {
    hdr[(r[1] || "").trim()] = (r[2] || "").trim();
  });

  // PERFORMA_TIM — now 14 cols: Program,LeadsT,LeadsR,IntT,IntR,DUT,DUR,UjianT,UjianR,BiayaT,BiayaR,SIS,Rapot,Kaldik
  const perfRaw = findSection(rows, "PERFORMA_TIM");
  const perf = perfRaw.filter(r => r[0] && r[0] !== "CCC").map(r => {
    const lt = num(r[1]), lr = num(r[2]);
    const it = num(r[3]), ir = num(r[4]);
    const dut = num(r[5]), dur = num(r[6]);
    const ujt = num(r[7]), ujr = num(r[8]);
    const bt = num(r[9]), br = num(r[10]);
    const sis = pct(r[11]), rapot = pct(r[12]), kaldik = pct(r[13]);
    return {
      prog: r[0].trim(),
      leadsT: lt, leadsR: lr, leadsPct: lt ? lr / lt : 0,
      intT: it, intR: ir, intPct: it ? ir / it : 0,
      duT: dut, duR: dur, duPct: dut ? dur / dut : 0,
      ujianT: ujt, ujianR: ujr, ujianPct: ujt ? ujr / ujt : 0,
      biayaT: bt, biayaR: br, biayaPct: bt ? br / bt : 0,
      sis, rapot, kaldik,
    };
  });
  // Also include CCC if it has data
  const cccRow = perfRaw.find(r => (r[0]||"").trim() === "CCC");
  if (cccRow) {
    const hasData = cccRow.slice(1, 10).some(v => num(v) > 0);
    if (hasData) {
      const lt = num(cccRow[1]), lr = num(cccRow[2]);
      const it = num(cccRow[3]), ir = num(cccRow[4]);
      const dut = num(cccRow[5]), dur = num(cccRow[6]);
      const ujt = num(cccRow[7]), ujr = num(cccRow[8]);
      const bt = num(cccRow[9]), br = num(cccRow[10]);
      perf.push({
        prog: "CCC", leadsT: lt, leadsR: lr, leadsPct: lt ? lr / lt : 0,
        intT: it, intR: ir, intPct: it ? ir / it : 0,
        duT: dut, duR: dur, duPct: dut ? dur / dut : 0,
        ujianT: ujt, ujianR: ujr, ujianPct: ujt ? ujr / ujt : 0,
        biayaT: bt, biayaR: br, biayaPct: bt ? br / bt : 0,
        sis: pct(cccRow[11]), rapot: pct(cccRow[12]), kaldik: pct(cccRow[13]),
      });
    }
  }

  // PAPAN_PERFORMA
  const papanRaw = findSection(rows, "PAPAN_PERFORMA");
  const papan = {};
  papanRaw.forEach(r => {
    const prog = (r[0] || "").trim();
    const kpi = (r[1] || "").trim();
    if (!prog || !kpi) return;
    if (!papan[kpi]) papan[kpi] = {};
    papan[kpi][prog] = {
      W1: pct(r[2]), W2: pct(r[3]), W3: pct(r[4]), W4: pct(r[5]), W5: pct(r[6]),
    };
  });

  // KALDIK_EVENTS
  const kaldikRaw = findSection(rows, "KALDIK_EVENTS");
  const kaldik = kaldikRaw
    .filter(r => r[0] && r[1] && r[2])
    .map(r => ({
      day: num(r[0]),
      prog: (r[1] || "").trim(),
      title: (r[2] || "").trim(),
      done: (r[3] || "").toLowerCase() === "true",
    }));

  // CASHFLOW
  const cfRaw = findSection(rows, "CASHFLOW_BULAN");
  const cashflow = { plan: 0, reality: 0 };
  cfRaw.forEach(r => {
    const k = (r[0] || "").trim().toLowerCase();
    if (k === "plan") cashflow.plan = num(r[1]);
    if (k === "reality") cashflow.reality = num(r[1]);
  });

  // TOP_COMMITMENT
  const cmtRaw = findSection(rows, "TOP_COMMITMENT");
  const commitments = cmtRaw
    .filter(r => r[0] && /urgent/i.test(r[1] || ""))
    .map(r => ({
      title: (r[0] || "").trim(),
      status: (r[1] || "").trim(),
      deadline: (r[2] || "").trim(),
    }));

  // PESERTA_AKTIF
  const paRaw = findSection(rows, "PESERTA_AKTIF_RINGKAS");
  const peserta = paRaw.filter(r => r[0] && r[1]).map(r => ({
    batch: (r[0] || "").trim(),
    prog: (r[1] || "").trim(),
    target: num(r[2]),
    aktif: num(r[3]),
    mundur: num(r[4]),
    sudahBayar: num(r[5]),
    belumBayar: num(r[6]),
    bayarPct: pct(r[7]),
  }));

  // FOTO_TIM
  const fotoRaw = findSection(rows, "FOTO_TIM");
  const fotos = {};
  fotoRaw.forEach(r => {
    const p = (r[0] || "").trim().toUpperCase();
    const u = (r[1] || "").trim();
    if (p && u && !u.includes("#REF")) {
      const mapped = p === "BREVET" ? "Brevet" : Object.keys(PROG).find(k => k.toUpperCase() === p) || p;
      fotos[mapped] = u;
    }
  });

  // PERFORMANCE_APPRAISAL
  const apRaw = findSection(rows, "PERFORMANCE_APPRAISAL");
  const appraisal = apRaw.filter(r => r[0] && r[1]).map(r => ({
    tier: (r[0] || "").trim(),
    indikator: (r[1] || "").trim(),
    bobot: pct(r[2]),
    skor: pct(r[3]),
  }));

  return { hdr, perf, papan, kaldik, cashflow, commitments, peserta, fotos, appraisal };
}

// ─────────────────────────────────────────────────────────────
// SAMPLE DATA (fallback when CSV_URL is empty)
// ─────────────────────────────────────────────────────────────
const SAMPLE_CSV = `Section,Key,Value
Header,Periode,Juni 2026
Header,PM,Ghina
PERFORMA_TIM
Program,LeadsT,LeadsR,IntT,IntR,DUT,DUR,UjianT,UjianR,BiayaT,BiayaR,SIS,Rapot,Kaldik
DBE,295,183,113,31,17,4,28,6,93000000,71046188,0.87,0,0.333
MMBA,420,90,76,8,20,0,32,3,171000000,156430000,0.87,0,0.333
SIC,460,69,70,11,17,0,30,1,92500000,49200000,0.87,0,0.333
DBS,124,9,36,0,4,0,8,0,32500000,27200000,0.87,0,0.333
Brevet,175,5,20,1,8,0,10,1,54000000,12250000,0.87,0,0.333

PAPAN_PERFORMA
Program,KPI,W1,W2,W3,W4,W5
DBE,Leads,0.306,0.338,0.026,0,0
MMBA,Leads,0,0.084,0.051,0.008,0
SIC,Leads,0.059,0.009,0.050,0.024,0
DBS,Leads,0,0.008,0.008,0,0
Brevet,Leads,0.018,0,0,0,0
DBE,Interview,0.045,0.138,0.097,0,0
MMBA,Interview,0,0.018,0.053,0,0
SIC,Interview,0.097,0.040,0.013,0,0
DBS,Interview,0,0,0,0,0
Brevet,Interview,0.033,0,0,0,0
DBE,Daftar Ujian,0.051,0.167,0,0,0
MMBA,Daftar Ujian,0.021,0,0.042,0,0
SIC,Daftar Ujian,0,0.033,0,0,0
DBS,Daftar Ujian,0,0,0,0,0
Brevet,Daftar Ujian,0.067,0,0,0,0
DBE,Daftar Ulang,0,0.083,0.111,0,0
MMBA,Daftar Ulang,0,0,0,0,0
SIC,Daftar Ulang,0,0,0,0,0
DBS,Daftar Ulang,0,0,0,0,0
Brevet,Daftar Ulang,0,0.067,0,0,0

KALDIK_EVENTS
Tanggal,Program,Judul,Done
20,DBE,Orientasi,FALSE
6,MMBA,Asesmen CRA,TRUE
20,SIC,Graduation,FALSE

CASHFLOW_BULAN
Key,Value
Plan,500000
Reality,750000

TOP_COMMITMENT
Judul,Status,Deadline
Review wajib minggu depan (all program),URGENT,20/06/2026
Pengisian Asertif (Deadline 25 Juni),URGENT,25/06/2026
ATPI!!,URGENT,20/06/2026
Buat aturan reward & share ke group,URGENT,22/06/2026
Follow up peserta belum bayar,URGENT,23/06/2026

PESERTA_AKTIF_RINGKAS
Batch,Program,Target,Aktif,Mundur,SudahBayar,BelumBayar,BayarPct
DBE-5,DBE,62,51,1,44,7,0.710
MMBA-5,MMBA,57,49,0,40,9,0.702
DBS-3,DBS,13,13,0,10,3,0.769
SIC-4,SIC,37,20,0,18,2,0.486
Brevet-2,Brevet,27,11,0,6,5,0.222

FOTO_TIM
Program,URL
DBE,https://drive.google.com/thumbnail?id=1MywpZ8s01M24c47m-jxeAHXqqhwtXCha&sz=w400
MMBA,https://drive.google.com/thumbnail?id=1iSw_kPDCJSxWNLlYTfN25yrjc_azJVzX&sz=w400
SIC,https://drive.google.com/thumbnail?id=183tPBw1vjeCzfeOICJ6RuwDyyh0q9jS7&sz=w400
DBS,https://drive.google.com/thumbnail?id=12yZvrjALqe2hhV3y7n94je6eyjhQkKXg&sz=w400
BREVET,https://drive.google.com/thumbnail?id=1-hyWkWmrERA4cGR2p-yL67Gdr2Xz7C2U&sz=w400

PERFORMANCE_APPRAISAL
Tier,Indikator,Bobot,Skor
WIG,Peserta Aktif,0.5,0.735
LM,Daftar Ulang,0.2,0.072
LM,Daftar Ujian,0.15,0.088
LM,Cashflow,0.05,0.667
DLM,Rapot,0.05,0
DLM,Kaldik,0.05,0.333`;

// ─────────────────────────────────────────────────────────────
// DATA HOOK
// ─────────────────────────────────────────────────────────────
function useData() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!CSV_URL) {
      setData(buildData(SAMPLE_CSV));
      setStatus("sample");
      return;
    }
    fetch(CSV_URL)
      .then(r => r.text())
      .then(text => {
        if (text.trim().startsWith("<!") || text.trim().startsWith("<html")) {
          throw new Error("URL mengembalikan HTML, bukan CSV. Pastikan URL adalah publish-to-web CSV.");
        }
        setData(buildData(text));
        setStatus("live");
      })
      .catch(e => {
        console.error("CSV fetch error:", e.message);
        setData(buildData(SAMPLE_CSV));
        setStatus("error");
      });
  }, []);
  return { data, status };
}

// ─────────────────────────────────────────────────────────────
// COMPONENTS
// ─────────────────────────────────────────────────────────────

function Badge({ status }) {
  const map = {
    live: { color: C.green, bg: C.greenBg, txt: C.greenTxt, label: "Live dari Google Sheets" },
    sample: { color: C.orange, bg: C.orangeBg, txt: C.orangeTxt, label: "Data Sampel" },
    error: { color: C.red, bg: C.redBg, txt: C.redTxt, label: "Gagal fetch — data sampel" },
    loading: { color: C.muted, bg: "#f3f4f6", txt: C.muted, label: "Memuat..." },
  };
  const s = map[status] || map.loading;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
      background: s.bg, color: s.txt,
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

function ProgDot({ prog, size = 10 }) {
  return <span style={{
    width: size, height: size, borderRadius: "50%", display: "inline-block",
    background: PROG[prog] || C.muted, flexShrink: 0,
  }} />;
}

function SectionLabel({ letter, color }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 26, height: 26, borderRadius: 6, fontSize: 13, fontWeight: 700,
      background: color || C.navy, color: "#fff", marginRight: 10,
    }}>{letter}</span>
  );
}

function PctBadge({ value, inverse }) {
  const v = typeof value === "number" ? value : pct(value);
  const good = inverse ? v <= 1 : v >= 0.85;
  const warn = inverse ? v <= 1.15 : v >= 0.6;
  const bg = v === 0 ? "#f3f4f6" : good ? C.greenBg : warn ? C.orangeBg : C.redBg;
  const fg = v === 0 ? C.muted : good ? C.greenTxt : warn ? C.orangeTxt : C.redTxt;
  return (
    <span style={{
      padding: "2px 8px", borderRadius: 4, fontSize: 13, fontWeight: 600,
      background: bg, color: fg, whiteSpace: "nowrap",
    }}>{fmtPct(v)}</span>
  );
}

// ─────────────────────────────────────────────────────────────
// OVERVIEW TABLE
// ─────────────────────────────────────────────────────────────
function PerfTable({ perf }) {
  const totals = useMemo(() => {
    const t = { leadsT: 0, leadsR: 0, intT: 0, intR: 0, duT: 0, duR: 0, ujianT: 0, ujianR: 0, biayaT: 0, biayaR: 0 };
    perf.forEach(p => {
      t.leadsT += p.leadsT; t.leadsR += p.leadsR;
      t.intT += p.intT; t.intR += p.intR;
      t.duT += p.duT; t.duR += p.duR;
      t.ujianT += p.ujianT; t.ujianR += p.ujianR;
      t.biayaT += p.biayaT; t.biayaR += p.biayaR;
    });
    return t;
  }, [perf]);

  const thStyle = {
    padding: "10px 12px", fontSize: 11, fontWeight: 700, color: C.muted,
    textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${C.border}`,
    textAlign: "center", whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "10px 12px", fontSize: 14, borderBottom: `1px solid ${C.border}`,
    textAlign: "center", whiteSpace: "nowrap",
  };

  return (
    <div style={{ overflowX: "auto", borderRadius: 12, background: C.white, border: `1px solid ${C.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
        <thead>
          <tr style={{ background: C.light }}>
            <th style={{ ...thStyle, textAlign: "left", minWidth: 120 }}>Program</th>
            <th style={thStyle}>Leads</th>
            <th style={thStyle}></th>
            <th style={thStyle}>%</th>
            <th style={thStyle}>Interview</th>
            <th style={thStyle}></th>
            <th style={thStyle}>DU</th>
            <th style={thStyle}></th>
            <th style={thStyle}>%</th>
            <th style={thStyle}>Biaya</th>
            <th style={thStyle}></th>
            <th style={thStyle}>%</th>
            <th style={thStyle}>SIS</th>
            <th style={thStyle}>Kaldik</th>
          </tr>
          <tr style={{ background: C.light }}>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0 }}></th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0, fontSize: 10, color: "#9ca3af" }}>Target</th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0, fontSize: 10, color: "#9ca3af" }}>Real</th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0 }}></th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0, fontSize: 10, color: "#9ca3af" }}>Target</th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0, fontSize: 10, color: "#9ca3af" }}>Real</th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0, fontSize: 10, color: "#9ca3af" }}>Target</th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0, fontSize: 10, color: "#9ca3af" }}>Real</th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0 }}></th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0, fontSize: 10, color: "#9ca3af" }}>Target</th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0, fontSize: 10, color: "#9ca3af" }}>Real</th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0 }}></th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0 }}></th>
            <th style={{ ...thStyle, borderTop: 0, paddingTop: 0 }}></th>
          </tr>
        </thead>
        <tbody>
          {perf.map((p, i) => (
            <tr key={p.prog} style={{ background: i % 2 === 0 ? C.white : C.light }}>
              <td style={{ ...tdStyle, textAlign: "left", fontWeight: 600 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ProgDot prog={p.prog} />
                  {p.prog}
                </span>
              </td>
              <td style={{ ...tdStyle, color: C.muted }}>{p.leadsT || "—"}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{p.leadsR || "—"}</td>
              <td style={tdStyle}><PctBadge value={p.leadsPct} /></td>
              <td style={{ ...tdStyle, color: C.muted }}>{p.intT || "—"}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{p.intR || "—"}</td>
              <td style={{ ...tdStyle, color: C.muted }}>{p.duT || "—"}</td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{p.duR || "—"}</td>
              <td style={tdStyle}><PctBadge value={p.duPct} /></td>
              <td style={{ ...tdStyle, color: C.muted, fontSize: 12 }}>{rp(p.biayaT)}</td>
              <td style={{ ...tdStyle, fontWeight: 600, fontSize: 12 }}>{rp(p.biayaR)}</td>
              <td style={tdStyle}><PctBadge value={p.biayaPct} /></td>
              <td style={tdStyle}><PctBadge value={p.sis} /></td>
              <td style={tdStyle}><PctBadge value={p.kaldik} /></td>
            </tr>
          ))}
          {/* TOTAL ROW */}
          <tr style={{ background: C.navy, color: "#fff" }}>
            <td style={{ ...tdStyle, textAlign: "left", fontWeight: 700, color: "#fff", borderBottom: 0 }}>TOTAL/AVG</td>
            <td style={{ ...tdStyle, color: "rgba(255,255,255,0.6)", borderBottom: 0 }}>{totals.leadsT}</td>
            <td style={{ ...tdStyle, fontWeight: 700, color: "#fff", borderBottom: 0 }}>{totals.leadsR}</td>
            <td style={{ ...tdStyle, borderBottom: 0 }}><PctBadge value={totals.leadsT ? totals.leadsR / totals.leadsT : 0} /></td>
            <td style={{ ...tdStyle, color: "rgba(255,255,255,0.6)", borderBottom: 0 }}>{totals.intT}</td>
            <td style={{ ...tdStyle, fontWeight: 700, color: "#fff", borderBottom: 0 }}>{totals.intR}</td>
            <td style={{ ...tdStyle, color: "rgba(255,255,255,0.6)", borderBottom: 0 }}>{totals.duT}</td>
            <td style={{ ...tdStyle, fontWeight: 700, color: "#fff", borderBottom: 0 }}>{totals.duR}</td>
            <td style={{ ...tdStyle, borderBottom: 0 }}><PctBadge value={totals.duT ? totals.duR / totals.duT : 0} /></td>
            <td style={{ ...tdStyle, color: "rgba(255,255,255,0.6)", fontSize: 12, borderBottom: 0 }}>{rp(totals.biayaT)}</td>
            <td style={{ ...tdStyle, fontWeight: 700, color: "#fff", fontSize: 12, borderBottom: 0 }}>{rp(totals.biayaR)}</td>
            <td style={{ ...tdStyle, borderBottom: 0 }}><PctBadge value={totals.biayaT ? totals.biayaR / totals.biayaT : 0} /></td>
            <td style={{ ...tdStyle, color: "rgba(255,255,255,0.5)", borderBottom: 0 }}>—</td>
            <td style={{ ...tdStyle, color: "rgba(255,255,255,0.5)", borderBottom: 0 }}>—</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD B: KALDIK CHECKLIST — DONUT
// ─────────────────────────────────────────────────────────────
function KaldikDonut({ kaldik }) {
  const selesai = kaldik.filter(k => k.done).length;
  const belum = kaldik.filter(k => !k.done).length;
  const total = kaldik.length || 1;
  const pctDone = selesai / total;

  const radius = 60, stroke = 14;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pctDone);

  const perluPerhatian = kaldik.filter(k => !k.done);

  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <SectionLabel letter="B" color={C.teal} />
        <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Kaldik — Checklist</span>
      </div>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        <div style={{ position: "relative", width: 140, height: 140, flexShrink: 0 }}>
          <svg width="140" height="140" viewBox="0 0 140 140">
            <circle cx="70" cy="70" r={radius} fill="none" stroke={C.border} strokeWidth={stroke} />
            <circle cx="70" cy="70" r={radius} fill="none" stroke={C.green}
              strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
              strokeLinecap="round" transform="rotate(-90 70 70)"
              style={{ transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", flexDirection: "column",
          }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: C.ink }}>{Math.round(pctDone * 100)}%</span>
          </div>
        </div>
        <div style={{ fontSize: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.green }} />
            <span>Selesai</span>
            <span style={{ fontWeight: 700, marginLeft: "auto" }}>{selesai}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.orange }} />
            <span>Progress</span>
            <span style={{ fontWeight: 700, marginLeft: "auto" }}>0</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.red }} />
            <span>Terlambat</span>
            <span style={{ fontWeight: 700, marginLeft: "auto" }}>0</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#9ca3af" }} />
            <span>Belum</span>
            <span style={{ fontWeight: 700, marginLeft: "auto" }}>{belum}</span>
          </div>
        </div>
      </div>
      {perluPerhatian.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 13, color: C.muted }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Perlu perhatian:</div>
          {perluPerhatian.slice(0, 3).map((k, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <ProgDot prog={k.prog} size={8} />
              <span>{k.prog} — {k.title} (tgl {k.day})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD C: EFISIENSI CASHFLOW
// ─────────────────────────────────────────────────────────────
function CashflowCard({ cashflow }) {
  const { plan, reality } = cashflow;
  const variance = plan > 0 ? ((reality - plan) / plan) : 0;
  const profit = reality - plan;

  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        <SectionLabel letter="C" color={C.green} />
        <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Efisiensi Cashflow</span>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1, background: C.blueBg, borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.navy, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Cash In</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>{rp(reality)}</div>
          <div style={{ fontSize: 12, color: C.greenTxt, marginTop: 4 }}>
            ▲ {fmtPct(plan > 0 ? reality / plan : 0)} vs target
          </div>
        </div>
        <div style={{ flex: 1, background: C.redBg, borderRadius: 12, padding: 16, textAlign: "center" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.redTxt, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Cash Out</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.redTxt }}>{rp(plan)}</div>
          <div style={{ fontSize: 12, color: C.redTxt, marginTop: 4 }}>
            ▼ {fmtPct(1)} vs budget
          </div>
        </div>
      </div>
      <div style={{
        marginTop: 16, background: C.greenBg, borderRadius: 12, padding: 16, textAlign: "center",
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.greenTxt, textTransform: "uppercase", letterSpacing: "0.05em" }}>PROFIT</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: C.greenTxt }}>{rp(profit)}</div>
        <div style={{ fontSize: 12, color: C.greenTxt, marginTop: 2 }}>
          ▲ {plan > 0 ? fmtPct(profit / plan) : "0%"} vs target
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD D: RAPOT — SIS
// ─────────────────────────────────────────────────────────────
function RapotSISCard({ perf }) {
  const avgSIS = perf.length ? perf.reduce((a, p) => a + p.sis, 0) / perf.length : 0;
  const sisScore = Math.round(avgSIS * 5 * 10) / 10; // out of 5
  const stars = Math.round(sisScore);

  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20, alignSelf: "flex-start" }}>
        <SectionLabel letter="D" color="#7c3aed" />
        <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Rapot — SIS</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
        <span style={{ fontSize: 56, fontWeight: 800, color: C.ink, lineHeight: 1 }}>{sisScore.toFixed(1)}</span>
        <span style={{ fontSize: 20, color: C.muted, fontWeight: 600 }}>/5</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{ fontSize: 24, color: n <= stars ? "#f59e0b" : "#d1d5db" }}>★</span>
        ))}
      </div>
      <div style={{ fontSize: 13, color: C.muted, textAlign: "center" }}>
        Rata-rata SIS semua program: <strong>{fmtPct(avgSIS)}</strong>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CARD E: KALENDER STRATEGI
// ─────────────────────────────────────────────────────────────
function KalenderCard({ kaldik, periode }) {
  const bulan = parseInt(periode?.match(/\d+/)?.[0]) || 6;
  const tahun = parseInt(periode?.match(/(\d{4})/)?.[1]) || 2026;
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const firstDow = new Date(tahun, bulan - 1, 1).getDay(); // 0=Sun
  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const today = new Date();
  const isThisMonth = today.getFullYear() === tahun && today.getMonth() === bulan - 1;
  const todayDate = isThisMonth ? today.getDate() : -1;

  const eventDays = new Set(kaldik.map(k => k.day));

  const cells = [];
  const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Monday start
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const agenda = kaldik.filter(k => k.day && k.title).slice(0, 5);

  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <SectionLabel letter="E" color="#6366f1" />
        <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Kalender Strategi</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center", marginBottom: 16 }}>
        {dayNames.map(d => (
          <div key={d} style={{ fontSize: 11, fontWeight: 600, color: C.muted, padding: 4 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const isToday = d === todayDate;
          const hasEvent = eventDays.has(d);
          return (
            <div key={d} style={{
              padding: 4, fontSize: 13, fontWeight: isToday || hasEvent ? 700 : 400,
              borderRadius: "50%", width: 32, height: 32, display: "flex",
              alignItems: "center", justifyContent: "center", margin: "0 auto",
              background: isToday ? C.blue : hasEvent ? C.blueBg : "transparent",
              color: isToday ? "#fff" : hasEvent ? C.navy : C.ink,
            }}>{d}</div>
          );
        })}
      </div>
      {agenda.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 8 }}>Agenda terdekat:</div>
          {agenda.map((k, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
              <ProgDot prog={k.prog} size={10} />
              <span style={{ fontWeight: 600, color: C.muted, minWidth: 48 }}>{k.day} Jun</span>
              <span style={{ color: C.ink }}>{k.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TOP COMMITMENTS
// ─────────────────────────────────────────────────────────────
function CommitmentsCard({ commitments }) {
  if (!commitments.length) return null;
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <SectionLabel letter="F" color={C.red} />
        <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Top Komitmen Urgent</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {commitments.slice(0, 5).map((c, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
            borderRadius: 10, background: C.light, border: `1px solid ${C.border}`,
          }}>
            <span style={{
              width: 24, height: 24, borderRadius: "50%", background: C.red,
              color: "#fff", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
            </div>
            <span style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>{c.deadline}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PERFORMANCE APPRAISAL
// ─────────────────────────────────────────────────────────────
function AppraisalCard({ appraisal }) {
  if (!appraisal.length) return null;
  const totalWeighted = appraisal.reduce((a, r) => a + r.bobot * r.skor, 0);
  const totalBobot = appraisal.reduce((a, r) => a + r.bobot, 0);

  const tierColors = { WIG: "#2563eb", LM: "#0891b2", DLM: "#7c3aed" };

  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <SectionLabel letter="G" color={C.navy} />
        <span style={{ fontWeight: 700, fontSize: 16, color: C.ink }}>Performance Appraisal</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {appraisal.map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "60px 1fr 60px 80px 1fr",
            gap: 8, alignItems: "center", padding: "8px 12px",
            borderRadius: 8, background: C.light,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: tierColors[r.tier] || C.muted,
              padding: "2px 8px", borderRadius: 4, textAlign: "center",
              background: r.tier === "WIG" ? C.blueBg : r.tier === "LM" ? "#cffafe" : "#ede9fe",
            }}>{r.tier}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{r.indikator}</span>
            <span style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>{fmtPct(r.bobot)}</span>
            <span style={{ textAlign: "center" }}><PctBadge value={r.skor} /></span>
            <div style={{ height: 6, borderRadius: 3, background: C.border, overflow: "hidden" }}>
              <div style={{
                width: `${Math.min(r.skor * 100, 100)}%`, height: "100%",
                borderRadius: 3, background: tierColors[r.tier] || C.muted,
                transition: "width 1s ease",
              }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{
        marginTop: 12, padding: "12px 16px", borderRadius: 10,
        background: `linear-gradient(135deg, ${C.navy}, ${C.navy2})`, color: "#fff",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Skor Tertimbang Total</span>
        <span style={{ fontSize: 22, fontWeight: 800 }}>{fmtPct(totalWeighted)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PESERTA AKTIF TABLE
// ─────────────────────────────────────────────────────────────
function PesertaTable({ peserta }) {
  if (!peserta.length) return null;
  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
      <div style={{ fontWeight: 700, fontSize: 16, color: C.ink, marginBottom: 16 }}>
        Peserta Aktif — Semua Batch
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Batch", "Target", "Aktif", "Mundur", "Bayar", "Belum", "% Bayar"].map(h => (
                <th key={h} style={{
                  padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.muted,
                  textTransform: "uppercase", borderBottom: `2px solid ${C.border}`,
                  textAlign: h === "Batch" ? "left" : "center",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {peserta.map((p, i) => (
              <tr key={p.batch} style={{ background: i % 2 === 0 ? C.white : C.light }}>
                <td style={{ padding: "8px 10px", fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <ProgDot prog={p.prog} size={8} />
                    {p.batch}
                  </span>
                </td>
                <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}>{p.target}</td>
                <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{p.aktif}</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: p.mundur > 0 ? C.red : C.muted, borderBottom: `1px solid ${C.border}` }}>{p.mundur}</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: C.greenTxt, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{p.sudahBayar}</td>
                <td style={{ padding: "8px 10px", textAlign: "center", color: p.belumBayar > 0 ? C.redTxt : C.muted, fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{p.belumBayar}</td>
                <td style={{ padding: "8px 10px", textAlign: "center", borderBottom: `1px solid ${C.border}` }}><PctBadge value={p.bayarPct} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: PAPAN PERFORMA (animated weekly bars)
// ─────────────────────────────────────────────────────────────
function PapanPerforma({ papan }) {
  const kpis = Object.keys(papan);
  const [selKPI, setSelKPI] = useState(kpis[0] || "Leads");
  const weeks = ["W1", "W2", "W3", "W4", "W5"];
  const programs = Object.keys(papan[selKPI] || {});

  const maxVal = useMemo(() => {
    let m = 0;
    programs.forEach(p => weeks.forEach(w => { m = Math.max(m, papan[selKPI]?.[p]?.[w] || 0); }));
    return m || 1;
  }, [selKPI, papan]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {kpis.map(k => (
          <button key={k} onClick={() => setSelKPI(k)} style={{
            padding: "8px 18px", borderRadius: 8, border: `1px solid ${selKPI === k ? C.navy : C.border}`,
            background: selKPI === k ? C.navy : C.white, color: selKPI === k ? "#fff" : C.ink,
            fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>{k}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {weeks.map(w => {
          const sorted = [...programs]
            .map(p => ({ prog: p, val: papan[selKPI]?.[p]?.[w] || 0 }))
            .sort((a, b) => b.val - a.val);
          return (
            <div key={w} style={{ background: C.white, borderRadius: 14, padding: 20, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 14 }}>{w}</div>
              {sorted.map((s, i) => (
                <div key={s.prog} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ProgDot prog={s.prog} size={8} />
                      <span style={{ fontWeight: 600 }}>{s.prog}</span>
                    </span>
                    <span style={{ fontWeight: 700, color: PROG[s.prog] || C.ink }}>{fmtPct(s.val)}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: C.border, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      background: `linear-gradient(90deg, ${PROG[s.prog] || C.muted}, ${PROG[s.prog] || C.muted}cc)`,
                      width: `${Math.min((s.val / maxVal) * 100, 100)}%`,
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: KALDIK (calendar view)
// ─────────────────────────────────────────────────────────────
function KaldikTab({ kaldik, periode }) {
  const bulan = 6; // Juni
  const tahun = 2026;
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  const firstDow = new Date(tahun, bulan - 1, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const today = new Date();
  const todayDate = today.getMonth() === bulan - 1 ? today.getDate() : -1;

  const eventsByDay = {};
  kaldik.forEach(k => {
    if (!eventsByDay[k.day]) eventsByDay[k.day] = [];
    eventsByDay[k.day].push(k);
  });

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, textAlign: "center" }}>
        {dayNames.map(d => (
          <div key={d} style={{ padding: 8, fontSize: 12, fontWeight: 700, color: C.muted }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} style={{ minHeight: 80 }} />;
          const evts = eventsByDay[d] || [];
          const isToday = d === todayDate;
          return (
            <div key={d} style={{
              minHeight: 80, padding: 6, borderRadius: 10,
              border: isToday ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
              background: isToday ? C.blueBg : C.white,
            }}>
              <div style={{ fontSize: 13, fontWeight: isToday ? 800 : 500, color: isToday ? C.blue : C.ink, marginBottom: 4 }}>{d}</div>
              {evts.map((e, j) => (
                <div key={j} style={{
                  fontSize: 10, padding: "2px 4px", borderRadius: 4, marginBottom: 2,
                  background: PROG_BG[e.prog] || "#f3f4f6",
                  color: PROG[e.prog] || C.ink,
                  fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textDecoration: e.done ? "line-through" : "none",
                  opacity: e.done ? 0.6 : 1,
                }}>
                  {e.prog}: {e.title}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────
export default function App() {
  const { data, status } = useData();
  const [tab, setTab] = useState("overview");

  if (!data) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: C.bg, fontFamily: "'Inter', -apple-system, sans-serif",
      }}>
        <div style={{ textAlign: "center", color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 16 }}>Memuat data...</div>
        </div>
      </div>
    );
  }

  const { hdr, perf, papan, kaldik, cashflow, commitments, peserta, fotos, appraisal } = data;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "papan", label: "Papan Performa" },
    { key: "kaldik", label: "Kaldik" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* HEADER */}
      <div style={{
        background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navy2} 100%)`,
        padding: "24px 32px 0",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {FOTO_PM && (
                <img src={FOTO_PM} alt="PM" style={{
                  width: 44, height: 44, borderRadius: "50%", objectFit: "cover",
                  border: "2px solid rgba(255,255,255,0.3)",
                }} />
              )}
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>
                  PM Scoreboard — {hdr.PM || "PM"}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                  {hdr.Periode || "Periode"}
                </div>
              </div>
            </div>
            <Badge status={status} />
          </div>
          {/* TABS */}
          <div style={{ display: "flex", gap: 0 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "12px 24px", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 600,
                background: tab === t.key ? C.bg : "transparent",
                color: tab === t.key ? C.navy : "rgba(255,255,255,0.7)",
                borderRadius: tab === t.key ? "10px 10px 0 0" : 0,
                transition: "all 0.2s ease",
              }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px 40px" }}>
        {tab === "overview" && (
          <div>
            {/* SECTION A: PERFORMA TIM */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
                <SectionLabel letter="A" color={C.navy} />
                <span style={{ fontWeight: 700, fontSize: 18, color: C.ink }}>Performa Tim — Semua Program</span>
                <span style={{
                  marginLeft: 12, fontSize: 12, padding: "3px 10px",
                  borderRadius: 12, background: C.greenBg, color: C.greenTxt, fontWeight: 600,
                }}>{perf.length} Program Aktif</span>
              </div>
              <PerfTable perf={perf} />
            </div>

            {/* 4 CARDS ROW */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 20, marginBottom: 24,
            }}>
              <KaldikDonut kaldik={kaldik} />
              <CashflowCard cashflow={cashflow} />
              <RapotSISCard perf={perf} />
              <KalenderCard kaldik={kaldik} periode={hdr.Periode} />
            </div>

            {/* COMMITMENTS + APPRAISAL ROW */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20, marginBottom: 24,
            }}>
              <CommitmentsCard commitments={commitments} />
              <AppraisalCard appraisal={appraisal} />
            </div>

            {/* PESERTA AKTIF */}
            <PesertaTable peserta={peserta} />
          </div>
        )}

        {tab === "papan" && <PapanPerforma papan={papan} />}

        {tab === "kaldik" && <KaldikTab kaldik={kaldik} periode={hdr.Periode} />}
      </div>

      {/* FOOTER */}
      <div style={{ textAlign: "center", padding: "16px 0 32px", fontSize: 12, color: C.muted }}>
        Sumber data: tab 90_EXPORT_DASHBOARD (publish-to-web CSV). Refresh halaman untuk update terbaru.
      </div>
    </div>
  );
}
