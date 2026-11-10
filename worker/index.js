const ORIGIN = "https://magdybnattia1.github.io";

function cors(origin) {
  const allowed = origin === ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed ? ORIGIN : "null",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {
  status, headers: {"Content-Type":"application/json; charset=utf-8", ...headers}
});
async function sign(value, secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), {name:"HMAC",hash:"SHA-256"}, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
async function tokenValid(request, env) {
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i,"");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  let data;
  try { data = JSON.parse(atob(payload.replace(/-/g,"+").replace(/_/g,"/"))); } catch { return false; }
  if (!data.exp || data.exp < Date.now()) return false;
  return (await sign(payload, env.SESSION_SECRET)) === signature;
}
async function readProducts(env) {
  const raw = await env.PRODUCTS.get("catalog");
  if (raw) { try { const saved=JSON.parse(raw); const demoNames=["تمثال فرعوني ديكوري","قناع ملكي ذهبي","مجسم هرم","لوحة بردي فنية","تمثال أبو الهول","صندوق هدايا فرعوني"]; return Array.isArray(saved)?saved.filter(p=>!demoNames.includes(p.n)):[]; } catch {} }
  return [];

}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin);
    const url = new URL(request.url);
    const shareId = url.pathname.startsWith("/p/") ? Number(url.pathname.slice(3)) : NaN;
    if (request.method === "GET" && Number.isSafeInteger(shareId) && shareId > 0) {
      const id = shareId;
      const product = (await readProducts(env)).find(p => Number(p.id) === id);
      if (!product) return new Response("المنتج غير موجود", {status:404});
      const esc = value => String(value ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
      const title = esc(product.n + " | OUDI PHARONIC");
      const description = esc((product.d || "ديكور مستوحى من الحضارة المصرية القديمة") + " — السعر: " + Number(product.p).toLocaleString("en-US") + " EGP");
      const destination = "https://magdybnattia1.github.io/oudi-pharonic/?product=" + id + "#product-" + id;
      const rawImage = String(product.image || "");
      const imageUrl = (rawImage.startsWith("https://") || rawImage.startsWith("http://")) ? rawImage : "https://magdybnattia1.github.io/oudi-pharonic/icon.svg";
      const page = "<!doctype html><html lang='ar' dir='rtl'><head><meta charset='utf-8'><title>"+title+"</title><meta name='description' content='"+description+"'><meta property='og:type' content='product'><meta property='og:title' content='"+title+"'><meta property='og:description' content='"+description+"'><meta property='og:url' content='https://oudi-pharonic.mangalefi.workers.dev/p/"+id+"'><meta property='og:image' content='"+esc(imageUrl)+"'><meta name='twitter:card' content='summary_large_image'><meta http-equiv='refresh' content='0;url="+destination+"'><script>location.replace("+JSON.stringify(destination)+")</script></head><body><a href='"+destination+"'>افتح المنتج</a></body></html>";
      return new Response(page,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"public, max-age=60"}});
    }
    if (request.method === "OPTIONS") return new Response(null, {status:204,headers});
    if (origin !== ORIGIN) return json({error:"Origin not allowed"},403,headers);
    if (url.pathname === "/api/login" && request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({error:"Invalid request"},400,headers); }
      if (typeof body.password !== "string" || body.password !== env.ADMIN_PASSWORD) return json({error:"كلمة المرور غير صحيحة"},401,headers);
      const payload = btoa(JSON.stringify({exp:Date.now()+8*60*60*1000,role:"admin"})).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
      return json({token:payload+"."+await sign(payload,env.SESSION_SECRET)},200,headers);
    }
    if (url.pathname === "/api/visitors" && request.method === "GET") {
      let count = 0, cursor;
      do {
        const page = await env.PRODUCTS.list({prefix:"visitor:", cursor, limit:1000});
        count += page.keys.length;
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return json({count},200,headers);
    }
    if (url.pathname === "/api/visitors" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({error:"Invalid visitor"},400,headers); }
      const id = String(body.id || "");
      if (!/^[a-zA-Z0-9_-]{16,80}$/.test(id)) return json({error:"Invalid visitor"},400,headers);
      const key = "visitor:" + id;
      if (!(await env.PRODUCTS.get(key))) await env.PRODUCTS.put(key,"1");
      let count = 0, cursor;
      do {
        const page = await env.PRODUCTS.list({prefix:"visitor:", cursor, limit:1000});
        count += page.keys.length;
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return json({count},200,headers);
    }
    if (url.pathname === "/api/products" && request.method === "GET") return json(await readProducts(env),200,headers);
    if (url.pathname.startsWith("/api/products")) {
      if (!(await tokenValid(request,env))) return json({error:"غير مصرح"},401,headers);
      let products = await readProducts(env);
      if (request.method === "POST") {
        let p; try { p=await request.json(); } catch { return json({error:"بيانات غير صحيحة"},400,headers); }
        if (!p.n || !Number.isFinite(Number(p.p)) || Number(p.p)<0) return json({error:"أدخل اسم المنتج والسعر بشكل صحيح"},400,headers);
        p={...p,id:Date.now(),p:Number(p.p),e:p.e||"𓂀",d:p.d||"",image:p.image||""};
        products.push(p); await env.PRODUCTS.put("catalog",JSON.stringify(products)); return json(p,201,headers);
      }
      const id = Number(url.pathname.split("/").pop());
      const index = products.findIndex(p=>p.id===id);
      if (request.method === "PUT") {
        if(index<0) return json({error:"المنتج غير موجود"},404,headers);
        let p; try { p=await request.json(); } catch { return json({error:"بيانات غير صحيحة"},400,headers); }
        if (!p.n || !Number.isFinite(Number(p.p)) || Number(p.p)<0) return json({error:"أدخل اسم المنتج والسعر بشكل صحيح"},400,headers);
        products[index]={...products[index],...p,id,p:Number(p.p)}; await env.PRODUCTS.put("catalog",JSON.stringify(products)); return json(products[index],200,headers);
      }
      if (request.method === "DELETE") {
        if(index<0) return json({error:"المنتج غير موجود"},404,headers);
        products.splice(index,1); await env.PRODUCTS.put("catalog",JSON.stringify(products)); return json({ok:true},200,headers);
      }
    }
    return json({error:"Not found"},404,headers);
  }
};