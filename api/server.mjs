import http from 'node:http';
import pg from 'pg';
import { createWorker } from 'tesseract.js';
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const USER_EMAIL='local@icec.lab';
async function userId(client=pool){const r=await client.query("SELECT id FROM app_users WHERE email=$1",[USER_EMAIL]);return r.rows[0]?.id}
function send(res,status,data,extra={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra});res.end(JSON.stringify(data))}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>15_000_000)throw new Error('payload too large')}return s?JSON.parse(s):{}}

let ocrWorkerPromise=null;
async function ocrWorker(){
 if(!ocrWorkerPromise)ocrWorkerPromise=(async()=>{const w=await createWorker('eng');return w})();
 return ocrWorkerPromise;
}
function num(v){if(v==null)return null;let s=String(v).trim().replace(/\s/g,'').replace(/(?<=\d)[oO](?=\d|\b)/g,'0').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null}
const LABELS={
 kcal:['energia','energy','energie','énergie','valor energetico','valor energético','wartosc energetyczna','wartość energetyczna','kraft'],
 fat:['grassi','fat','fett','graisses','grasas','vetten','tluszcz','tłuszcz','fett'],
 carbs:['carboidrati','carbohydrates','kohlenhydrate','glucides','hidratos de carbono','koolhydraten','weglowodany','węglowodany','kolhydrater'],
 sugars:['di cui zuccheri','of which sugars','davon zucker','dont sucres','de los cuales azucares','de los cuales azúcares','waarvan suikers','w tym cukry','varav sockerarter','zuccheri'],
 fiber:['fibre','fiber','fibres alimentaires','fibra alimentaria','vezels','blonnik','błonnik'],
 protein:['proteine','protein','eiweiss','eiweiß','protéines','proteínas','eiwitten','bialko','białko','proteiner'],
 salt:['sale','salt','salz','sel','sal','zout','sól','sol'],
 saturatedFat:['acidi grassi saturi','saturates','gesättigte fettsäuren','acides gras saturés','ácidos gras saturados','verzadigde vetzuren','kwasy tluszczowe nasycone','mättade fettsyror']
};
function norm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[|]/g,' ').replace(/\s+/g,' ').trim()}
function hasAny(line,arr){const n=norm(line);return arr.some(x=>n.includes(norm(x)))}
function values(line){return [...String(line||'').matchAll(/(\d{1,4}(?:[.,]\d{1,2})?)\s*(kcal|kj|g|%|gr\/kg)?/gi)].map(m=>({n:num(m[1]),unit:(m[2]||'').toLowerCase(),raw:m[0]})).filter(x=>x.n!=null)}
function findRow(lines,key){const aliases=LABELS[key]||[];for(let i=0;i<lines.length;i++){if(hasAny(lines[i],aliases))return {i,line:lines[i]}}return null}
function numericNear(lines,row,maxAhead=2){if(!row)return [];let a=values(row.line);for(let j=1;j<=maxAhead && a.length===0;j++)a=values(lines[row.i+j]||'');return a}
function choosePer100(vals,key){let a=vals.filter(x=>x.unit!=='kj'&&x.unit!=='kcal');if(key==='kcal')a=vals.filter(x=>x.unit==='kcal'||(!x.unit&&x.n>=100));if(!a.length)return null;const plausible=a.filter(x=>key==='kcal'?(x.n>=20&&x.n<=1000):(x.n>=0&&x.n<=100));return (plausible[0]||a[0])?.n??null}
function findDirect(t,patterns){for(const re of patterns){const m=t.match(re);if(m){const n=num(m[1]);if(n!=null)return n}}return null}
function parseLabelText(text,docType='nutrition'){
 const raw=String(text||'').replace(/\r/g,'');
 const lines=raw.split('\n').map(x=>x.trim()).filter(Boolean);
 const out={},fieldConfidence={},evidence={};
 for(const key of ['fat','carbs','sugars','fiber','protein','salt']){const row=findRow(lines,key);const v=choosePer100(numericNear(lines,row),key);if(v!=null){out[key]=v;fieldConfidence[key]=82;evidence[key]=row?.line||''}}
 // Energy labels are frequently separated from the numeric cell by OCR, so inspect nearby lines and then the whole document.
 const er=findRow(lines,'kcal');let ev=choosePer100(numericNear(lines,er,3),'kcal');if(ev==null){const ks=[...raw.matchAll(/(\d{2,4})\s*kcal/gi)].map(m=>num(m[1])).filter(x=>x>=20&&x<=1000);ev=ks[0]??null}if(ev!=null){out.kcal=ev;fieldConfidence.kcal=85;evidence.kcal=er?.line||'kcal'}
 out.pac=findDirect(raw,[/\bPAC\s*[:=\-]?\s*(\d{1,4}(?:[.,]\d+)?)/i]);
 out.pod=findDirect(raw,[/\bPOD\s*[:=\-]?\s*(\d{1,4}(?:[.,]\d+)?)/i]);
 out.solids=findDirect(raw,[/(?:sostanza\s+secca|dry\s+matter|solidi\s+totali)[^\d\n]{0,30}(\d{1,3}(?:[.,]\d+)?)\s*%?/i]);
 out.water=findDirect(raw,[/(?:umidit[aà]|moisture|acqua)[^\d\n]{0,30}(\d{1,3}(?:[.,]\d+)?)\s*%?/i]);
 for(const k of ['pac','pod','solids','water'])if(out[k]!=null){fieldConfidence[k]=90;evidence[k]='dato tecnico rilevato'}
 // Ingredient list may span multiple lines. Capture until a known next section.
 const im=raw.match(/(?:ingredienti|ingredients)\s*[:\-]?\s*([\s\S]{5,700}?)(?=\n\s*(?:de:|fr:|es:|nl:|pl:|se:|valori nutrizionali|nutritional values|da consumarsi|best before|$))/i);if(im)out.ingredientsText=im[1].replace(/\n/g,' ').replace(/\s+/g,' ').trim();
 // Plausibility checks and field-level confidence.
 const warnings=[];
 if(out.sugars!=null&&out.carbs!=null&&out.sugars>out.carbs+0.2){warnings.push('Zuccheri superiori ai carboidrati: controllare la colonna letta.');fieldConfidence.sugars=Math.min(fieldConfidence.sugars||50,35)}
 for(const k of ['fat','carbs','sugars','fiber','protein','salt'])if(out[k]!=null&&(out[k]<0||out[k]>100)){warnings.push(`${k}: valore fuori intervallo 0–100 g/100 g.`);fieldConfidence[k]=25}
 if(out.solids!=null&&out.water!=null&&Math.abs(out.solids+out.water-100)>2)warnings.push('Sostanza secca + umidità non è circa 100%.');
 // Detect whether the label explicitly refers to 100 g.
 const per100=/(?:per|su|on|auf|sur|en|op|na|pa)\s*100\s*g|100\s*g\s*(?:di prodotto|product)/i.test(raw);
 if(!per100)warnings.push('Riferimento per 100 g non riconosciuto con certezza.');
 const found=Object.keys(out).filter(k=>k!=='ingredientsText');
 const avg=found.length?Math.round(found.reduce((a,k)=>a+(fieldConfidence[k]||60),0)/found.length):0;
 return {fields:out,found,fieldConfidence,evidence,warnings,per100Detected:per100,parserConfidence:avg,documentType:docType};
}

async function loadState(){
 const uid=await userId();
 const [ir,rr,pr,nr]=await Promise.all([
  pool.query('SELECT payload FROM ingredients WHERE user_id=$1 ORDER BY name',[uid]),
  pool.query('SELECT id,payload FROM recipes WHERE user_id=$1 ORDER BY name',[uid]),
  pool.query('SELECT name,payload FROM product_profiles WHERE user_id=$1 ORDER BY name',[uid]),
  pool.query(`SELECT r.payload->>'id' AS legacy_recipe_id,n.id,n.note,n.recipe_snapshot,n.created_at FROM recipe_notes n JOIN recipes r ON r.id=n.recipe_id WHERE r.user_id=$1 ORDER BY n.created_at`,[uid])
 ]);
 const empty=ir.rowCount===0&&rr.rowCount===0&&pr.rowCount===0;
 if(empty)return {empty:true,state:null,counts:{ingredients:0,recipes:0,profiles:0,notes:0}};
 const feedbacks={}; for(const n of nr.rows){const rid=n.legacy_recipe_id;if(!rid)continue;(feedbacks[rid]||(feedbacks[rid]=[])).push({id:String(n.id),date:n.created_at,note:n.note,snapshot:n.recipe_snapshot});}
 const profiles={}; for(const p of pr.rows)profiles[p.name]=p.payload;
 return {empty:false,state:{ingredients:ir.rows.map(x=>x.payload),recipes:rr.rows.map(x=>x.payload),profiles,feedbacks},counts:{ingredients:ir.rowCount,recipes:rr.rowCount,profiles:pr.rowCount,notes:nr.rowCount}};
}
async function replaceState(state){
 const ingredients=Array.isArray(state.ingredients)?state.ingredients:[];
 const recipes=Array.isArray(state.recipes)?state.recipes:[];
 const profiles=state.profiles&&typeof state.profiles==='object'?state.profiles:{};
 const feedbacks=state.feedbacks&&typeof state.feedbacks==='object'?state.feedbacks:{};
 const c=await pool.connect(); try{await c.query('BEGIN');const uid=await userId(c);
  await c.query('DELETE FROM recipe_notes WHERE recipe_id IN (SELECT id FROM recipes WHERE user_id=$1)',[uid]);
  await c.query('DELETE FROM recipes WHERE user_id=$1',[uid]); await c.query('DELETE FROM ingredients WHERE user_id=$1',[uid]); await c.query('DELETE FROM product_profiles WHERE user_id=$1',[uid]);
  const ingNames=new Map(); for(const i of ingredients){if(!i?.name)continue;const n=(ingNames.get(i.name)||0)+1;ingNames.set(i.name,n);const storageName=n===1?i.name:`${i.name} [${i.id||n}]`;await c.query('INSERT INTO ingredients(user_id,name,category,payload) VALUES($1,$2,$3,$4::jsonb)',[uid,storageName,i.category||null,JSON.stringify(i)]);}
  const recipeIds=new Map(),recipeNames=new Map(); for(const r of recipes){if(!r?.name)continue;const n=(recipeNames.get(r.name)||0)+1;recipeNames.set(r.name,n);const storageName=n===1?r.name:`${r.name} [${r.id||n}]`;const q=await c.query('INSERT INTO recipes(user_id,name,category,payload) VALUES($1,$2,$3,$4::jsonb) RETURNING id',[uid,storageName,r.category||null,JSON.stringify(r)]);recipeIds.set(String(r.id),q.rows[0].id);}
  for(const [name,p] of Object.entries(profiles)){await c.query('INSERT INTO product_profiles(user_id,name,payload) VALUES($1,$2,$3::jsonb)',[uid,name,JSON.stringify(p)]);}
  for(const [legacyRid,notes] of Object.entries(feedbacks)){const rid=recipeIds.get(String(legacyRid));if(!rid||!Array.isArray(notes))continue;for(const n of notes){if(!n?.note)continue;await c.query('INSERT INTO recipe_notes(recipe_id,note,recipe_snapshot,created_at) VALUES($1,$2,$3::jsonb,$4)',[rid,n.note,JSON.stringify(n.snapshot||{}),n.date||new Date().toISOString()]);}}
  await c.query('COMMIT'); return {ingredients:ingredients.length,recipes:recipes.length,profiles:Object.keys(profiles).length,notes:Object.values(feedbacks).reduce((a,x)=>a+(Array.isArray(x)?x.length:0),0)};
 }catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}
}

async function integrityReport(){
 const uid=await userId();
 const [ic,rc,pc,nc,di,dr,orph]=await Promise.all([
  pool.query('SELECT count(*)::int n FROM ingredients WHERE user_id=$1',[uid]),
  pool.query('SELECT count(*)::int n FROM recipes WHERE user_id=$1',[uid]),
  pool.query('SELECT count(*)::int n FROM product_profiles WHERE user_id=$1',[uid]),
  pool.query('SELECT count(*)::int n FROM recipe_notes n JOIN recipes r ON r.id=n.recipe_id WHERE r.user_id=$1',[uid]),
  pool.query('SELECT lower(name) name,count(*)::int n FROM ingredients WHERE user_id=$1 GROUP BY lower(name) HAVING count(*)>1',[uid]),
  pool.query('SELECT lower(name) name,count(*)::int n FROM recipes WHERE user_id=$1 GROUP BY lower(name) HAVING count(*)>1',[uid]),
  pool.query('SELECT count(*)::int n FROM recipe_notes n LEFT JOIN recipes r ON r.id=n.recipe_id WHERE r.id IS NULL')
 ]);
 const issues=[];
 if(di.rowCount)issues.push('Nomi ingrediente duplicati ignorando maiuscole/minuscole: '+di.rows.map(x=>x.name).join(', '));
 if(dr.rowCount)issues.push('Nomi ricetta duplicati ignorando maiuscole/minuscole: '+dr.rows.map(x=>x.name).join(', '));
 if(orph.rows[0].n)issues.push('Note orfane: '+orph.rows[0].n);
 return {ok:issues.length===0,counts:{ingredients:ic.rows[0].n,recipes:rc.rows[0].n,profiles:pc.rows[0].n,notes:nc.rows[0].n},issues};
}

const server=http.createServer(async(req,res)=>{try{
 if(req.url==='/api/health'){await pool.query('SELECT 1');return send(res,200,{ok:true,version:'0.7.2'})}
 if(req.url==='/api/ocr'&&req.method==='POST'){
  const b=await body(req); if(!b?.imageDataUrl)return send(res,400,{ok:false,error:'image required'});
  const w=await ocrWorker(); const r=await w.recognize(b.imageDataUrl); const parsed=parseLabelText(r.data.text,b.documentType||'nutrition');
  return send(res,200,{ok:true,text:r.data.text,confidence:Math.round(r.data.confidence||0),...parsed});
 }
 if(req.url==='/api/integrity'&&req.method==='GET'){return send(res,200,await integrityReport())}
 if(req.url==='/api/export'&&req.method==='GET'){const x=await loadState();return send(res,200,{format:'icec-lab-export',version:'0.7.2',exportedAt:new Date().toISOString(),...x},{'content-disposition':'attachment; filename=icec-lab-export.json'})}
 if(req.url==='/api/state'&&req.method==='GET'){return send(res,200,{ok:true,...await loadState()})}
 if(req.url==='/api/state'&&req.method==='PUT'){const b=await body(req);if(!b?.state||typeof b.state!=='object')return send(res,400,{ok:false,error:'invalid state'});const counts=await replaceState(b.state);return send(res,200,{ok:true,counts})}
 send(res,404,{ok:false,error:'not found'});
 }catch(e){console.error(e);send(res,500,{ok:false,error:e.message})}});
server.listen(3001,'0.0.0.0',()=>console.log('IceC API v0.7.2 listening on 3001'));
