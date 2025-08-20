// supabase/functions/contact-submit/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const TO   = "jiejourneys@gmail.com";
const FROM = "JieJourneys <onboarding@resend.dev>"; // 先用預設寄件人

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed",{status:405});

  // 來源限制（只接受你的網站）
  const origin = req.headers.get("origin") || "";
  if (!/https:\/\/(www\.)?busantrip\.vercel\.app$/i.test(origin)) {
    return Response.json({ ok:false }, { status: 403 });
  }

  const { name = "", email = "", message = "" } = await req.json().catch(() => ({}));
  if (!name || !email || !message) {
    return Response.json({ ok:false, error:"missing fields" }, { status:400 });
  }

  const escape = (s:string)=>s.replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]!));
  const subject = `【聯絡表單】${escape(name)} 來自 JieJourneys`;
  const htmlBody = `
    <h3>聯絡表單</h3>
    <p><b>姓名：</b>${escape(name)}</p>
    <p><b>Email：</b>${escape(email)}</p>
    <p><b>訊息：</b></p>
    <pre style="white-space:pre-wrap;font-family:inherit">${escape(message)}</pre>`;

  // 寄給站長
  const ok1 = await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{ "Authorization":`Bearer ${RESEND_API_KEY}`, "Content-Type":"application/json" },
    body: JSON.stringify({ to: TO, from: FROM, subject, html: htmlBody, reply_to: email })
  }).then(r=>r.ok).catch(()=>false);

  // 寄確認信給使用者
  const ok2 = await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{ "Authorization":`Bearer ${RESEND_API_KEY}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      to: email, from: FROM, subject:"我們已收到您的訊息｜JieJourneys",
      html: `<p>您好 ${escape(name)}，我們已收到您的訊息，會盡快回覆。</p><hr>${htmlBody}`
    })
  }).then(r=>r.ok).catch(()=>false);

  return Response.json({ ok: ok1 && ok2 });
});
