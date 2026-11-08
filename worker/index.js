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
    if (request.method === "OPTIONS") return new Response(null, {status:204,headers});
    if (origin !== ORIGIN) return json({error:"Origin not allowed"},403,headers);
    const url = new URL(request.url);
    if (url.pathname === "/api/login" && request.method === "POST") {
      let body; try { body = await request.json(); } catch { return json({error:"Invalid request"},400,headers); }
      if (typeof body.password !== "string" || body.password !== env.ADMIN_PASSWORD) return json({error:"كلمة المرور غير صحيحة"},401,headers);
      const payload = btoa(JSON.stringify({exp:Date.now()+8*60*60*1000,role:"admin"})).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
      return json({token:payload+"."+await sign(payload,env.SESSION_SECRET)},200,headers);
    }
    if (url.pathname === "/api/products" && request.method === "GET") return json(await readProducts(env),200,headers);
    if (url.pathname.startsWith("/api/products")) {
      if (!(await tokenValid(request,env))) return json({error:"غير مصرح"},401,headers);
      let products = await readProducts(env);
      if (request.method === "POST") {
        let p; try { p=await request.json(); } catch { return json({error:"بيانات غير صحيحة"},400,headers); }
        if (!p.n || !p.c || !Number.isFinite(Number(p.p)) || Number(p.p)<0) return json({error:"أدخل الاسم والتصنيف والسعر بشكل صحيح"},400,headers);
        p={...p,id:Date.now(),p:Number(p.p),e:p.e||"𓂀",d:p.d||"",image:p.image||""};
        products.push(p); await env.PRODUCTS.put("catalog",JSON.stringify(products)); return json(p,201,headers);
      }
      const id = Number(url.pathname.split("/").pop());
      const index = products.findIndex(p=>p.id===id);
      if (request.method === "PUT") {
        if(index<0) return json({error:"المنتج غير موجود"},404,headers);
        let p; try { p=await request.json(); } catch { return json({error:"بيانات غير صحيحة"},400,headers); }
        if (!p.n || !p.c || !Number.isFinite(Number(p.p)) || Number(p.p)<0) return json({error:"أدخل الاسم والتصنيف والسعر بشكل صحيح"},400,headers);
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