import React, { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────
// LIVE DATA — paste URL publish-to-web CSV tab 90_EXPORT_DASHBOARD
// ─────────────────────────────────────────────────────────────
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSxeXQjctXiL9WBqxDHgb4GtMIcUgw2OkoD6xZFwkrfLhvUMAA-hUPTP5D8mrqMjNwAmowpkfzmtk19/pub?gid=1965086356&single=true&output=csv"; // <-- paste URL CSV di sini

// Foto PM (kamu) — paste URL foto langsung di sini
const FOTO_PM = "https://drive.google.com/uc?export=view&id=1hHXUbp27jvg9fK05zYIlMneHAs1zAf7M"; // contoh: "https://i.imgur.com/xxxx.jpg"

const NAVY = "#16335c", NAVY2 = "#1f4576", INK = "#0f1d33";
const progColor = { DBE:"#2563eb", MMBA:"#7c3aed", SIC:"#0891b2", DBS:"#ea580c", Brevet:"#16a34a", CCC:"#64748b", All:"#16335c" };

function parseCSV(text) {
  return text.split(/\r?\n/).map(r => {
    const out=[]; let cur=""; let q=false;
    for (let i=0;i<r.length;i++){ const ch=r[i];
      if(ch==='"'){q=!q;continue;}
      if(ch===',' && !q){out.push(cur);cur="";continue;}
      cur+=ch; }
    out.push(cur); return out;
  });
}
function num(v){ let s=String(v).replace(/%/g,"").replace(/[^0-9.\-]/g,""); const n=parseFloat(s); return isNaN(n)?0:n; }
function pctNum(v){ let s=String(v).trim(); if(s.includes("%")){ return num(s)/100; } return num(s); }
function findSection(rows, label) {
  const idx = rows.findIndex(r => (r[0]||"").trim() === label);
  if (idx === -1) return [];
  const out = [];
  const stops = ["Header","PERFORMA_TIM","PAPAN_PERFORMA","KALDIK_EVENTS","CASHFLOW","CASHFLOW_BULAN","RAPOT_INDEKS","TOP_COMMITMENT","PESERTA_AKTIF_RINGKAS","FOTO_TIM"];
  for (let i=idx+2;i<rows.length;i++){
    const r=rows[i]||[];
    if(stops.includes((r[0]||"").trim())) break;
    if(!r[0] && !r[1] && !r[2]) break;
    out.push(r);
  }
  return out;
}
function kv(rows, label, key){ const r=rows.find(x=>(x[0]||"")===label && (x[1]||"")===key); return r?r[2]:""; }

function buildData(text) {
  const rows = parseCSV(text);
  const perf = findSection(rows,"PERFORMA_TIM").filter(r=>r[0]);
  const papan = findSection(rows,"PAPAN_PERFORMA").filter(r=>r[0]);
  const kaldikR = findSection(rows,"KALDIK_EVENTS").filter(r=>r[0]&&num(r[0])>0);
  const cashB = findSection(rows,"CASHFLOW_BULAN").filter(r=>r[0]);
  const topC = findSection(rows,"TOP_COMMITMENT").filter(r=>r[0]);
  const aktif = findSection(rows,"PESERTA_AKTIF_RINGKAS").filter(r=>r[0]);
  const foto = findSection(rows,"FOTO_TIM").filter(r=>r[0]);
  const fotoMap = Object.fromEntries(foto.map(r=>[r[0], r[1]]));

  const performaTim = perf.map(r=>({
    program:r[0], aktifT:num(r[1]), aktifR:num(r[2]), duT:num(r[3]), duR:num(r[4]),
    djT:num(r[5]), djR:num(r[6]), biayaT:num(r[7]), biayaR:num(r[8]),
    sis:pctNum(r[9]), rapot:pctNum(r[10]), kaldik:pctNum(r[11]),
    skor:pctNum(r[12]), status:(r[13]||"-").trim(),
  }));

  const papanDU=[], papanDJ=[];
  papan.forEach(r=>{ const o={program:r[0],pct:pctNum(r[2])};
    if((r[1]||"").includes("Ulang")) papanDU.push(o); else papanDJ.push(o); });

  const kaldikEvents = kaldikR.map(r=>({ tgl:num(r[0]), prog:(r[1]||"").trim(), judul:r[2], done:String(r[3]).toUpperCase()==="TRUE" }));

  const cashPlan = num(cashB.find(r=>(r[0]||"").toLowerCase().includes("plan"))?.[1]);
  const cashReal = num(cashB.find(r=>(r[0]||"").toLowerCase().includes("real"))?.[1]);

  const komitmen = topC.map(r=>({ judul:r[0], status:r[1], deadline:r[2] })).slice(0,5);

  const pesertaAktif = aktif.map(r=>({
    batch:r[0], program:r[1], target:num(r[2]), aktif:num(r[3]),
    mundur:num(r[4]), bayar:num(r[5]), belumBayar:num(r[6]), bayarPct:pctNum(r[7]),
  }));

  const aktifPrograms = performaTim.filter(p=>p.status!=="-"&&p.status!=="");
  return {
    periode: kv(rows,"Header","Periode")||"—",
    pm: kv(rows,"Header","PM")||"—",
    performaTim, fotoMap,
    ringkasan: {
      jumlahProgram: aktifPrograms.length,
      cashPlan, cashReal, cashVariance: cashPlan-cashReal,
      performaRata: aktifPrograms.length? aktifPrograms.reduce((a,p)=>a+p.skor,0)/aktifPrograms.length : 0,
      kaldikDone: kaldikEvents.filter(e=>e.done).length, kaldikTotal: Math.max(1,kaldikEvents.length),
      sisRata: aktifPrograms.length? aktifPrograms.reduce((a,p)=>a+p.sis,0)/aktifPrograms.length : 0,
    },
    papanDU, papanDJ, kaldikEvents, komitmen, pesertaAktif,
  };
}

function useData(){
  const [data,setData]=useState(null);
  const [status,setStatus]=useState(CSV_URL?"loading":"sample");
  useEffect(()=>{ if(!CSV_URL){ setData(SAMPLE); return; }
    fetch(CSV_URL).then(r=>r.text()).then(t=>{ setData(buildData(t)); setStatus("live"); })
      .catch(()=>{ setData(SAMPLE); setStatus("error"); });
  },[]);
  return { data, status };
}

const rupiah=(n)=> n>=1e9?`Rp ${(n/1e9).toFixed(2)} M`: n>=1e6?`Rp ${Math.round(n/1e6)} jt`:`Rp ${(n||0).toLocaleString("id")}`;
const pct=(n)=>`${Math.round((n||0)*100)}%`;

function StatCard({label,value,sub,tone="neutral"}){
  const t={blue:"#eff4fb",green:"#eaf6ee",red:"#fdecec",amber:"#fdf4e3",violet:"#f1ecfb",cyan:"#e8f4f8",mint:"#eaf6f0",neutral:"#f1f4f8"};
  const a={blue:"#2563eb",green:"#16a34a",red:"#dc2626",amber:"#d97706",violet:"#7c3aed",cyan:"#0891b2",mint:"#0d9488",neutral:"#475569"};
  return <div style={{background:t[tone],borderRadius:16,padding:"16px 18px",border:"1px solid rgba(0,0,0,.04)"}}>
    <div style={{fontSize:22,fontWeight:800,color:a[tone],lineHeight:1.1}}>{value}</div>
    <div style={{fontSize:11,fontWeight:700,color:"#334155",marginTop:4,textTransform:"uppercase",letterSpacing:".04em"}}>{label}</div>
    {sub&&<div style={{fontSize:11,color:"#64748b",marginTop:2}}>{sub}</div>}
  </div>;
}
function Donut({value,size=120,stroke=14,color="#16a34a"}){
  const r=(size-stroke)/2,circ=2*Math.PI*r; const [a,setA]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setA(value),120);return()=>clearTimeout(t);},[value]);
  return <svg width={size} height={size}>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e8edf3" strokeWidth={stroke}/>
    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
      strokeDasharray={circ} strokeDashoffset={circ*(1-a)} strokeLinecap="round"
      transform={`rotate(-90 ${size/2} ${size/2})`} style={{transition:"stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)"}}/>
    <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" fontSize={size*0.2} fontWeight="800" fill={INK}>{Math.round(value*100)}%</text>
  </svg>;
}
function statusPill(s){
  const m={"Baik":["#dcfce7","#15803d"],"Perhatian":["#fef3c7","#b45309"],"Kritis":["#fee2e2","#b91c1c"],"-":["#f1f5f9","#94a3b8"]};
  const [bg,fg]=m[s]||m["-"];
  return <span style={{background:bg,color:fg,fontSize:11,fontWeight:800,padding:"4px 12px",borderRadius:999,textTransform:"uppercase"}}>{s}</span>;
}
function SectionTitle({eyebrow,title,note}){
  return <div style={{display:"flex",alignItems:"baseline",gap:10,marginBottom:14}}>
    {eyebrow&&<span style={{background:NAVY,color:"#fff",width:24,height:24,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:13}}>{eyebrow}</span>}
    <h3 style={{margin:0,fontSize:16,fontWeight:800,color:INK}}>{title}</h3>
    {note&&<span style={{fontSize:12,color:"#94a3b8"}}>{note}</span>}
  </div>;
}

function Overview({data}){
  const d=data, r=d.ringkasan;
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:16}}>
      <StatCard tone="blue" label="Program Dimonitor" value={r.jumlahProgram} sub="program aktif"/>
      <StatCard tone="violet" label="Rata-rata Performa" value={pct(r.performaRata)} sub="skor program"/>
      <StatCard tone="cyan" label="Kaldik" value={`${r.kaldikDone}/${r.kaldikTotal}`} sub={`${Math.round(r.kaldikDone/r.kaldikTotal*100)}% terlaksana`}/>
      <StatCard tone="mint" label="SIS Rata-rata" value={pct(r.sisRata)} sub="kepatuhan WHT"/>
    </div>

    <section style={card}>
      <SectionTitle eyebrow="A" title="Performa Tim (Utama)" note="Peserta Aktif · DU · DJ · Biaya · SIS · Rapot · Kaldik"/>
      <div style={{overflowX:"auto"}}>
        <table style={tbl}>
          <thead><tr>
            <th style={thL}>Program</th>
            <th style={th}>Aktif T</th><th style={th}>Aktif R</th>
            <th style={th}>DU T</th><th style={th}>DU R</th>
            <th style={th}>DJ T</th><th style={th}>DJ R</th>
            <th style={th}>Biaya T</th><th style={th}>Biaya R</th>
            <th style={th}>Skor</th><th style={th}>Status</th>
          </tr></thead>
          <tbody>
            {d.performaTim.map((p,i)=>(
              <tr key={p.program} style={{background:i%2?"#f8fafc":"#fff"}}>
                <td style={tdL}><span style={{width:9,height:9,borderRadius:3,background:progColor[p.program],display:"inline-block",marginRight:8}}/>{p.program}</td>
                <td style={td}>{p.aktifT||"—"}</td><td style={td}>{p.aktifR||"—"}</td>
                <td style={td}>{p.duT||"—"}</td><td style={td}>{p.duR||"—"}</td>
                <td style={td}>{p.djT||"—"}</td><td style={td}>{p.djR||"—"}</td>
                <td style={td}>{p.biayaT?rupiah(p.biayaT):"—"}</td><td style={td}>{p.biayaR?rupiah(p.biayaR):"—"}</td>
                <td style={{...td,fontWeight:800}}>{p.status!=="-"?pct(p.skor):"—"}</td>
                <td style={td}>{statusPill(p.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section style={{...card,marginTop:16}}>
      <SectionTitle eyebrow="P" title="Peserta Aktif — Angkatan Berjalan" note="bulan terpilih"/>
      <div style={{overflowX:"auto"}}>
        <table style={tbl}>
          <thead><tr>
            <th style={thL}>Batch</th><th style={th}>Program</th><th style={th}>Target</th>
            <th style={th}>Aktif</th><th style={th}>Mundur</th><th style={th}>Sudah Bayar</th>
            <th style={th}>Belum Bayar</th><th style={th}>Bayar %</th>
          </tr></thead>
          <tbody>
            {d.pesertaAktif.length===0 && <tr><td style={td} colSpan={8}>Belum ada data (cek section PESERTA_AKTIF_RINGKAS di Sheet)</td></tr>}
            {d.pesertaAktif.map((p,i)=>(
              <tr key={p.batch} style={{background:i%2?"#f8fafc":"#fff"}}>
                <td style={tdL}>{p.batch}</td><td style={td}>{p.program}</td><td style={td}>{p.target}</td>
                <td style={{...td,fontWeight:700}}>{p.aktif}</td>
                <td style={{...td,color:p.mundur>0?"#dc2626":"#334155"}}>{p.mundur}</td>
                <td style={td}>{p.bayar}</td>
                <td style={{...td,color:p.belumBayar>0?"#d97706":"#334155"}}>{p.belumBayar}</td>
                <td style={{...td,fontWeight:700,color:p.bayarPct>=0.85?"#16a34a":p.bayarPct>=0.6?"#d97706":"#dc2626"}}>{pct(p.bayarPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16,marginTop:16}}>
      <section style={card}>
        <SectionTitle eyebrow="B" title="Kaldik — Checklist"/>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <Donut value={r.kaldikDone/r.kaldikTotal} color="#16a34a"/>
          <div style={{flex:1,fontSize:13}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>✅ Terlaksana</span><b>{r.kaldikDone}</b></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>⏳ Belum</span><b>{r.kaldikTotal-r.kaldikDone}</b></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderTop:"1px solid #eef2f7",marginTop:4}}><span>Total event</span><b>{r.kaldikTotal}</b></div>
          </div>
        </div>
      </section>

      <section style={card}>
        <SectionTitle eyebrow="C" title="Efisiensi Cash Out" note="bulan terpilih"/>
        <div style={{display:"flex",gap:10,marginBottom:10}}>
          <div style={{flex:1,background:"#eff4fb",borderRadius:12,padding:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#2563eb"}}>PLAN</div>
            <div style={{fontSize:17,fontWeight:800,color:"#2563eb"}}>{rupiah(r.cashPlan)}</div>
          </div>
          <div style={{flex:1,background:"#fdf4e3",borderRadius:12,padding:12}}>
            <div style={{fontSize:11,fontWeight:700,color:"#b45309"}}>REALITY</div>
            <div style={{fontSize:17,fontWeight:800,color:"#d97706"}}>{rupiah(r.cashReal)}</div>
          </div>
        </div>
        <div style={{background: r.cashVariance>=0?"#eaf6ee":"#fdecec",borderRadius:12,padding:14,textAlign:"center"}}>
          <div style={{fontSize:11,fontWeight:700,color: r.cashVariance>=0?"#15803d":"#b91c1c"}}>VARIANCE (PLAN − REALITY)</div>
          <div style={{fontSize:22,fontWeight:800,color: r.cashVariance>=0?"#16a34a":"#dc2626"}}>{rupiah(Math.abs(r.cashVariance))}</div>
          <div style={{fontSize:12,color: r.cashVariance>=0?"#16a34a":"#dc2626",fontWeight:700,marginTop:2}}>
            {r.cashVariance>=0?"✅ Berhasil jaga cash out":"⚠ Bengkak — lebihi plan"}
          </div>
        </div>
      </section>

      <section style={card}>
        <SectionTitle eyebrow="E" title="Komitmen Urgent — Ghina" note="status Urgent"/>
        {d.komitmen.length===0 && <div style={{fontSize:13,color:"#94a3b8"}}>Tidak ada komitmen urgent saat ini 🎉</div>}
        {d.komitmen.map((k,i)=>(
          <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:i<d.komitmen.length-1?"1px solid #f1f5f9":"none",alignItems:"flex-start"}}>
            <span style={{background:"#fee2e2",color:"#b91c1c",fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:6,whiteSpace:"nowrap",marginTop:2}}>URGENT</span>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:INK}}>{k.judul}</div>
              {k.deadline&&<div style={{fontSize:11,color:"#94a3b8"}}>🎯 {k.deadline}</div>}
            </div>
          </div>
        ))}
      </section>
    </div>
  </div>;
}

function PapanPerforma({data}){
  return <div>
    <div style={{textAlign:"center",marginBottom:20}}>
      <h2 style={{fontSize:34,fontWeight:900,color:NAVY,margin:0,letterSpacing:"-.02em"}}>🚀 PAPAN PERFORMA</h2>
      <div style={{color:"#64748b",fontWeight:600,marginTop:2}}>Minggu berjalan</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:20}}>
      <RankBoard title="DAFTAR ULANG" rows={data.papanDU} accent="#7c3aed" fotoMap={data.fotoMap}/>
      <RankBoard title="DAFTAR UJIAN" rows={data.papanDJ} accent="#0891b2" fotoMap={data.fotoMap}/>
    </div>
  </div>;
}
function RankBoard({title,rows,accent,fotoMap}){
  const max=Math.max(...rows.map(r=>r.pct),0.01);
  const sorted=[...rows].sort((a,b)=>b.pct-a.pct);
  const [show,setShow]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setShow(true),100);return()=>clearTimeout(t);},[]);
  return <div style={{...card,padding:20}}>
    <h3 style={{textAlign:"center",color:NAVY,fontWeight:800,marginTop:0,marginBottom:18}}>{title}</h3>
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {sorted.length===0 && <div style={{textAlign:"center",color:"#94a3b8",fontSize:13}}>Belum ada data minggu ini</div>}
      {sorted.map((r,i)=>(
        <div key={r.program} style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:82,display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}>
            {fotoMap&&fotoMap[r.program] ? (
              <img src={fotoMap[r.program]} alt={r.program} style={{width:32,height:32,borderRadius:"50%",objectFit:"cover",border:`2px solid ${accent}`}}/>
            ) : (i===0&&<span>👑</span>)}
            <span style={{fontWeight:700,fontSize:13,color:"#334155"}}>{r.program}</span>
          </div>
          <div style={{flex:1,background:"#eef2f7",borderRadius:99,height:34,position:"relative",overflow:"hidden"}}>
            <div style={{width:show?`${Math.max(r.pct/max*100,8)}%`:"0%",height:"100%",
              background:i===0?`linear-gradient(90deg,${accent},#a855f7)`:accent,borderRadius:99,
              transition:`width 1.1s cubic-bezier(.34,1.2,.4,1) ${i*0.12}s`,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:12,boxSizing:"border-box"}}>
              <span style={{color:"#fff",fontWeight:800,fontSize:13}}>{Math.round(r.pct*100)}%</span>
            </div>
            {i===0&&<span style={{position:"absolute",right:-2,top:-2,fontSize:18}}>🏆</span>}
          </div>
        </div>
      ))}
    </div>
    {sorted[0]&&<div style={{textAlign:"center",marginTop:16,fontSize:12,color:"#64748b"}}>Top minggu ini: <b style={{color:accent}}>{sorted[0].program}</b> 🎉</div>}
  </div>;
}

function KaldikView({data}){
  const events=data.kaldikEvents;
  const bulan=new Date().getMonth()+1, tahun=2026;
  const first=new Date(tahun,bulan-1,1).getDay();
  const offset=(first+6)%7;
  const days=new Date(tahun,bulan,0).getDate();
  const byDay={}; events.forEach(e=>{(byDay[e.tgl]=byDay[e.tgl]||[]).push(e);});
  const cells=[...Array(offset).fill(null),...Array.from({length:days},(_,i)=>i+1)];
  const done=events.filter(e=>e.done).length;
  const namaBulan=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][bulan-1];
  const progList=[...new Set(events.map(e=>e.prog))];
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
      <h2 style={{fontSize:26,fontWeight:800,color:NAVY,margin:0}}>📅 Kaldik — {namaBulan} {tahun}</h2>
      <div style={{background:"#eaf6ee",borderRadius:12,padding:"8px 16px",fontWeight:700,color:"#15803d"}}>
        {done}/{events.length} terlaksana ({events.length?Math.round(done/events.length*100):0}%)
      </div>
    </div>
    <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:12}}>
      {progList.map(p=>(
        <div key={p} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:600}}>
          <span style={{width:14,height:14,borderRadius:4,background:progColor[p]||"#94a3b8"}}/>{p}
        </div>
      ))}
    </div>
    <section style={card}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6,fontSize:12,fontWeight:700,color:"#64748b",textAlign:"center",marginBottom:6}}>
        {["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"].map(dd=><div key={dd}>{dd}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:6}}>
        {cells.map((c,i)=>(
          <div key={i} style={{minHeight:90,borderRadius:10,padding:6,background:c?"#f8fafc":"transparent",border:c?"1px solid #eef2f7":"none"}}>
            {c&&<div style={{fontSize:12,fontWeight:700,color:"#94a3b8",marginBottom:3}}>{c}</div>}
            {(byDay[c]||[]).map((e,ix)=>(
              <div key={ix} style={{fontSize:10,background:(progColor[e.prog]||"#94a3b8")+"22",color:progColor[e.prog]||"#475569",
                borderLeft:`4px solid ${progColor[e.prog]||"#94a3b8"}`,borderRadius:4,padding:"3px 5px",marginBottom:3,lineHeight:1.25,fontWeight:600}}>
                <b>{e.prog}</b> {e.judul} {e.done?"✅":"⏳"}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  </div>;
}

const card={background:"#fff",borderRadius:18,padding:20,border:"1px solid #eef2f7",boxShadow:"0 1px 3px rgba(15,29,51,.05)"};
const tbl={width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:720};
const th={padding:"8px 6px",color:"#64748b",fontWeight:700,fontSize:10,textTransform:"uppercase",letterSpacing:".03em",borderBottom:"2px solid #eef2f7",textAlign:"center"};
const thL={...th,textAlign:"left",paddingLeft:10};
const td={padding:"9px 6px",textAlign:"center",borderBottom:"1px solid #f1f5f9"};
const tdL={...td,textAlign:"left",paddingLeft:10,fontWeight:700};

function StatusBadge({status}){
  const m={live:{bg:"#dcfce7",fg:"#15803d",label:"🟢 Live dari Google Sheets"},sample:{bg:"#fef3c7",fg:"#b45309",label:"🟡 Data contoh"},loading:{bg:"#e0f2fe",fg:"#0369a1",label:"⏳ Memuat..."},error:{bg:"#fee2e2",fg:"#b91c1c",label:"🔴 Gagal — pakai contoh"}};
  const s=m[status]||m.sample;
  return <div style={{background:s.bg,color:s.fg,fontSize:11,fontWeight:700,padding:"6px 14px",borderRadius:999,display:"inline-block"}}>{s.label}</div>;
}

export default function App(){
  const [tab,setTab]=useState("overview");
  const {data,status}=useData();
  const tabs=[["overview","Overview"],["papan","Papan Performa"],["kaldik","Kaldik"]];
  if(!data) return <div style={{padding:40,fontFamily:"system-ui"}}>⏳ Memuat dashboard...</div>;
  return <div style={{fontFamily:"'Inter',system-ui,sans-serif",background:"#eef1f6",minHeight:"100vh",padding:"0 0 40px"}}>
    <header style={{background:`linear-gradient(120deg,${INK},${NAVY2})`,color:"#fff",padding:"22px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
      <div>
        <h1 style={{margin:0,fontSize:22,fontWeight:900,letterSpacing:"-.02em"}}>PM Scoreboard — Overview Performa</h1>
        <div style={{opacity:.8,fontSize:13,marginTop:2}}>Monitoring kinerja program di bawah pengawasan PM</div>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        <div style={{background:"rgba(255,255,255,.12)",borderRadius:12,padding:"8px 16px",textAlign:"center"}}>
          <div style={{fontSize:10,opacity:.7,textTransform:"uppercase"}}>Periode</div>
          <div style={{fontWeight:800}}>{data.periode}</div>
        </div>
        <div style={{background:"rgba(255,255,255,.12)",borderRadius:12,padding:"8px 16px",display:"flex",alignItems:"center",gap:10}}>
          {FOTO_PM ? <img src={FOTO_PM} alt="PM" style={{width:38,height:38,borderRadius:"50%",objectFit:"cover",border:"2px solid rgba(255,255,255,.5)"}}/>
                   : <div style={{width:38,height:38,borderRadius:"50%",background:"rgba(255,255,255,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>👤</div>}
          <div style={{textAlign:"left"}}>
            <div style={{fontSize:10,opacity:.7,textTransform:"uppercase"}}>Project Manager</div>
            <div style={{fontWeight:800}}>{data.pm}</div>
          </div>
        </div>
      </div>
    </header>

    <nav style={{display:"flex",gap:6,padding:"14px 28px 0",background:"#fff",borderBottom:"1px solid #eef2f7",position:"sticky",top:0,zIndex:5,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:6}}>
        {tabs.map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{border:"none",background:"none",padding:"10px 16px",fontSize:14,fontWeight:700,cursor:"pointer",color:tab===k?NAVY:"#94a3b8",borderBottom:tab===k?`3px solid ${NAVY}`:"3px solid transparent",marginBottom:-1}}>{l}</button>
        ))}
      </div>
      <div style={{paddingBottom:10}}><StatusBadge status={status}/></div>
    </nav>

    <main style={{padding:"22px 28px",maxWidth:1280,margin:"0 auto"}}>
      {tab==="overview"&&<Overview data={data}/>}
      {tab==="papan"&&<PapanPerforma data={data}/>}
      {tab==="kaldik"&&<KaldikView data={data}/>}
    </main>

    <footer style={{textAlign:"center",fontSize:11,color:"#94a3b8",padding:"0 28px"}}>
      Sumber: tab 90_EXPORT_DASHBOARD (publish-to-web CSV). Refresh untuk update terbaru.
    </footer>
  </div>;
}

const SAMPLE = {
  periode:"Juni 2026", pm:"Ghina", fotoMap:{},
  performaTim:[
    {program:"DBE",aktifT:71,aktifR:68,duT:80,duR:72,djT:120,djR:128,biayaT:800e6,biayaR:760e6,sis:0.8,rapot:0.9,kaldik:0.33,skor:0.85,status:"Baik"},
    {program:"MMBA",aktifT:50,aktifR:48,duT:70,duR:60,djT:100,djR:95,biayaT:600e6,biayaR:550e6,sis:0.75,rapot:0.8,kaldik:0.33,skor:0.78,status:"Perhatian"},
    {program:"SIC",aktifT:60,aktifR:58,duT:50,duR:55,djT:80,djR:90,biayaT:400e6,biayaR:380e6,sis:0.82,rapot:0.85,kaldik:0.33,skor:0.90,status:"Baik"},
    {program:"DBS",aktifT:40,aktifR:38,duT:40,duR:45,djT:60,djR:50,biayaT:300e6,biayaR:280e6,sis:0.7,rapot:0.75,kaldik:0,skor:0.75,status:"Perhatian"},
    {program:"Brevet",aktifT:55,aktifR:53,duT:60,duR:58,djT:90,djR:88,biayaT:350e6,biayaR:345e6,sis:0.78,rapot:0.82,kaldik:0,skor:0.83,status:"Baik"},
    {program:"CCC",aktifT:0,aktifR:0,duT:0,duR:0,djT:0,djR:0,biayaT:0,biayaR:0,sis:0,rapot:0,kaldik:0,skor:0,status:"-"},
  ],
  ringkasan:{jumlahProgram:5,cashPlan:1.98e9,cashReal:1.85e9,cashVariance:0.13e9,performaRata:0.822,kaldikDone:1,kaldikTotal:3,sisRata:0.77},
  papanDU:[{program:"Brevet",pct:1.5},{program:"DBS",pct:1.0},{program:"MMBA",pct:0.6},{program:"DBE",pct:0.4},{program:"SIC",pct:0.33}],
  papanDJ:[{program:"MMBA",pct:0.14},{program:"DBE",pct:0.10},{program:"SIC",pct:0.08},{program:"DBS",pct:0.05},{program:"Brevet",pct:0.03}],
  kaldikEvents:[{tgl:20,prog:"DBE",judul:"Orientasi",done:false},{tgl:5,prog:"MMBA",judul:"Asesmen CRA",done:true},{tgl:20,prog:"SIC",judul:"Graduation",done:false}],
  komitmen:[{judul:"Finalisasi CRM MMBA",status:"Urgent",deadline:"25 Jun"},{judul:"Review cashflow DBS",status:"Urgent",deadline:"28 Jun"}],
  pesertaAktif:[
    {batch:"DBE-5",program:"DBE",target:71,aktif:68,mundur:3,bayar:62,belumBayar:6,bayarPct:0.87},
    {batch:"SIC-5",program:"SIC",target:60,aktif:58,mundur:2,bayar:55,belumBayar:3,bayarPct:0.92},
  ],
};
