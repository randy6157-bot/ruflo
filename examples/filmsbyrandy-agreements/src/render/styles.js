// Shared dark editorial styles (Unbounded + Manrope, near-black, neon purple + cyan).

export const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@400;600;800&display=swap" rel="stylesheet">';

export const CSS = `
:root{
  --bg:#07070c; --bg2:#0d0d16; --card:#11111c; --card2:#161625; --line:#23233a;
  --text:#f2f2f7; --muted:#9a9ab2; --dim:#6b6b85;
  --purple:#a855f7; --purple2:#c084fc; --cyan:#22d3ee; --cyan2:#67e8f9;
  --ok:#34d399; --warn:#fbbf24; --err:#f87171;
  --r:20px; --r-sm:12px;
  --grad:linear-gradient(120deg,var(--purple) 0%,var(--cyan) 100%);
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:400 16px/1.6 Manrope,system-ui,sans-serif;
  background-image:radial-gradient(60rem 30rem at 110% -10%,rgba(168,85,247,.16),transparent 60%),
  radial-gradient(50rem 30rem at -20% 20%,rgba(34,211,238,.10),transparent 60%);background-attachment:fixed}
a{color:var(--cyan2)}
.wrap{max-width:760px;margin:0 auto;padding:24px 16px 64px}
.brand{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:4px 0 28px}
.logo{font:800 15px/1 Unbounded,sans-serif;letter-spacing:.02em;text-decoration:none;color:var(--text)}
.logo span{background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.tag{font:600 11px/1 Manrope;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);
  border:1px solid var(--line);padding:8px 12px;border-radius:999px}
h1,h2,h3{font-family:Unbounded,sans-serif;font-weight:600;letter-spacing:-.01em;margin:0}
h1{font-size:clamp(28px,8vw,46px);line-height:1.08;font-weight:800}
h1 em{font-style:normal;background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
h2{font-size:18px;margin-bottom:6px}
.eyebrow{font:700 11px/1 Manrope;letter-spacing:.18em;text-transform:uppercase;color:var(--cyan);margin:0 0 12px}
.lede{color:var(--muted);margin:14px 0 28px;max-width:56ch}
.step{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;
  background:rgba(168,85,247,.15);color:var(--purple2);font:700 13px/1 Unbounded;margin-right:10px;flex:none}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:22px 18px;margin:0 0 18px}
.card-h{display:flex;align-items:center;margin-bottom:14px}
.sub{color:var(--muted);font-size:14px;margin:0 0 16px}
.rate{position:relative;border:0;background:linear-gradient(var(--card2),var(--card2)) padding-box,var(--grad) border-box;
  border:1.5px solid transparent;box-shadow:0 0 0 1px rgba(168,85,247,.08),0 20px 60px -20px rgba(168,85,247,.45)}
.rate .total{font:800 clamp(36px,11vw,54px)/1 Unbounded;margin:6px 0 4px}
.rate .total small{font:500 14px Manrope;color:var(--muted);margin-left:6px}
.kv{display:grid;grid-template-columns:1fr;gap:0;margin:18px 0 0}
.kv div{display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-top:1px solid var(--line);font-size:15px}
.kv dt{color:var(--muted)} .kv dd{margin:0;text-align:right;font-weight:600}
.pill{display:inline-block;font:700 11px/1 Manrope;letter-spacing:.1em;text-transform:uppercase;padding:7px 10px;border-radius:999px}
.pill.purple{background:rgba(168,85,247,.16);color:var(--purple2)}
.pill.cyan{background:rgba(34,211,238,.14);color:var(--cyan2)}
.pill.ok{background:rgba(52,211,153,.14);color:var(--ok)}
.pill.warn{background:rgba(251,191,36,.14);color:var(--warn)}
.terms{max-height:420px;overflow:auto;padding-right:6px;border-radius:var(--r-sm)}
.terms.open{max-height:none}
.terms h3{font:600 14px/1.3 Unbounded;margin:18px 0 6px;color:var(--purple2)}
.terms h3:first-child{margin-top:0}
.terms p{margin:0;color:#d4d4e2;font-size:15px}
.link-btn{background:none;border:0;color:var(--cyan2);font:600 14px Manrope;padding:10px 0 0;cursor:pointer}
label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px}
label .opt{color:var(--dim);font-weight:500}
input[type=text],input[type=email],input[type=number],input[type=date],textarea,select{color-scheme:dark;width:100%;background:var(--bg2);color:var(--text);
  border:1px solid var(--line);border-radius:var(--r-sm);padding:13px 14px;font:500 16px Manrope;outline:none}
input:focus,textarea:focus,select:focus{border-color:var(--purple);box-shadow:0 0 0 3px rgba(168,85,247,.2)}
textarea{min-height:96px;resize:vertical}
.seg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 16px}
.seg label{margin:0;cursor:pointer}
.seg input{position:absolute;opacity:0;pointer-events:none}
.seg .box{display:block;border:1px solid var(--line);border-radius:var(--r-sm);padding:14px;background:var(--bg2);height:100%}
.seg .box b{display:block;font:700 18px Unbounded}
.seg .box span{font-weight:500;color:var(--muted);font-size:13px}
.seg input:checked+.box{border-color:var(--cyan);background:rgba(34,211,238,.07);box-shadow:0 0 0 3px rgba(34,211,238,.12)}
.seg input:focus-visible+.box{outline:2px solid var(--cyan)}
.due{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--bg2);border-radius:var(--r-sm);padding:14px;font-size:14px;margin-bottom:16px}
.due b{font-family:Unbounded;font-weight:600}
.pay{border:1px solid var(--line);border-radius:var(--r-sm);padding:16px;margin:10px 0;background:var(--bg2)}
.pay-h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
.pay-h h3{font-size:15px}
.pay p{margin:0 0 12px;color:var(--muted);font-size:14px}
.pay ol{margin:0 0 12px;padding-left:20px;color:var(--muted);font-size:14px}
.handle{font:600 15px Manrope;color:var(--text);word-break:break-all}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:12px 18px;border-radius:999px;
  font:700 15px Manrope;text-decoration:none;cursor:pointer;border:1px solid var(--line);background:var(--card2);color:var(--text)}
.btn.primary{border:0;background:var(--grad);color:#07070c}
.btn.block{width:100%}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn-row{display:flex;gap:10px;flex-wrap:wrap}
.check{display:flex;gap:12px;align-items:flex-start;font-weight:500;margin:16px 0 0;cursor:pointer}
.check input{width:22px;height:22px;accent-color:var(--purple);margin:1px 0 0;flex:none}
.sigtabs{display:flex;gap:8px;margin-bottom:10px}
.sigtabs button{flex:1;min-height:42px;border-radius:999px;border:1px solid var(--line);background:var(--bg2);color:var(--muted);font:700 14px Manrope;cursor:pointer}
.sigtabs button[aria-selected=true]{color:var(--text);border-color:var(--purple);background:rgba(168,85,247,.12)}
.sigpad{position:relative;background:#fbfbff;border-radius:var(--r-sm);height:180px;touch-action:none;overflow:hidden}
.sigpad canvas{width:100%;height:100%;display:block}
.sigpad .line{position:absolute;left:18px;right:18px;bottom:40px;border-bottom:1px dashed #b9b9cc;pointer-events:none}
.sigpad .hint{position:absolute;left:18px;bottom:14px;color:#8a8aa0;font-size:12px;pointer-events:none}
.typed-preview{background:#fbfbff;color:#141428;border-radius:var(--r-sm);min-height:110px;display:flex;align-items:center;
  padding:16px 20px;font:italic 600 34px/1.1 "Snell Roundhand","Segoe Script","Brush Script MT",cursive;margin-top:10px;word-break:break-word}
.sig-img{background:#fbfbff;border-radius:var(--r-sm);padding:10px;max-width:100%}
.sig-img img{max-width:100%;height:auto;display:block}
.err{color:var(--err);font-size:14px;margin:12px 0 0;min-height:1em}
.notice{border-radius:var(--r);padding:20px 18px;margin:0 0 18px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.3)}
.notice h2{color:var(--ok)}
.foot{margin-top:40px;padding-top:24px;border-top:1px solid var(--line);text-align:center;color:var(--dim);font-size:13px}
.foot .sig{font:italic 600 30px/1 "Snell Roundhand","Segoe Script","Brush Script MT",cursive;margin-bottom:10px;
  background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(120px);background:var(--card2);border:1px solid var(--line);
  padding:12px 18px;border-radius:999px;font-weight:600;font-size:14px;transition:transform .25s}
.toast.show{transform:translateX(-50%) translateY(0)}
@media (min-width:640px){
  .wrap{padding:40px 24px 80px}
  .card{padding:28px}
  .kv{grid-template-columns:1fr 1fr;column-gap:28px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
`;
