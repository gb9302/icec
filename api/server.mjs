import http from 'node:http';
import pg from 'pg';
import { createWorker } from 'tesseract.js';
import sharp from 'sharp';
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
 kcal:['energia','energy','energie','valor energetico','wartosc energetyczna','kraft'],
 fat:['grassi',' fat ','fett','graisses','grasas','vetten','tluszcz'],
 carbs:['carboidrati','carbohydrates','kohlenhydrate','glucides','hidratos de carbono','koolhydraten','weglowodany','kolhydrater'],
 sugars:['di cui zuccheri','of which sugars','davon zucker','dont sucres','de los cuales azucares','waarvan suikers','w tym cukry','varav sockerarter'],
 fiber:['fibre','fiber','fibres alimentaires','fibra alimentaria','vezels','blonnik'],
 protein:['proteine','protein','eiweiss','proteines','proteinas','eiwitten','bialko','proteiner'],
 salt:['sale','salt','salz',' sel ',' sal ','zout','sol'],
 saturatedFat:['acidi grassi saturi','saturates','gesattigte fettsauren','acides gras satures','acidos gras saturados','verzadigde vetzuren','kwasy tluszczowe nasycone','mattade fettsyror']
};
function norm(s){return (' '+String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[|]/g,' ').replace(/[^a-z0-9.,%:/\- ]/g,' ').replace(/\s+/g,' ').trim()+' ')}
function hasAny(line,arr){const n=norm(line);return arr.some(x=>n.includes(norm(x).trim()))}
function tokens(line){return [...String(line||'').matchAll(/(?<![A-Za-z])([0-9Oo]{1,4}(?:[.,][0-9Oo]{1,2})?)\s*(kcal|kj|g|%|gr\/kg)?/gi)].map(m=>({n:num(m[1]),unit:(m[2]||'').toLowerCase(),raw:m[0],index:m.index??0})).filter(x=>x.n!=null)}
function rowFor(lines,key){for(let i=0;i<lines.length;i++){if(hasAny(lines[i],LABELS[key]||[]))return {i,line:lines[i]}}return null}
function isOtherNutrient(line,key){return Object.entries(LABELS).some(([k,a])=>k!==key&&hasAny(line,a))}
function strictRowValue(lines,key){const row=rowFor(lines,key);if(!row)return null;let candidates=tokens(row.line);if(!candidates.length){const next=lines[row.i+1]||'';if(next && !isOtherNutrient(next,key))candidates=tokens(next)}
 if(key==='kcal'){const kcal=candidates.filter(x=>x.unit==='kcal'&&x.n>=20&&x.n<=1000);return kcal.length?{value:kcal[0].n,row:row.line,raw:kcal[0].raw}:null}
 const grams=candidates.filter(x=>x.unit==='g'&&x.n>=0&&x.n<=100);if(grams.length)return {value:grams[grams.length-1].n,row:row.line,raw:grams[grams.length-1].raw};
 const plausible=candidates.filter(x=>!x.unit&&x.n>=0&&x.n<=100);return plausible.length?{value:plausible[plausible.length-1].n,row:row.line,raw:plausible[plausible.length-1].raw}:null
}
function findDirect(t,patterns,max=1000){for(const re of patterns){const m=t.match(re);if(m){const n=num(m[1]);if(n!=null&&n>=0&&n<=max)return n}}return null}
function possibleDecimal(raw,key){const d=String(raw||'').replace(/\D/g,'');if(!d)return null;if(['fat','carbs','sugars','fiber','protein','salt'].includes(key)&&d.length===3){const n=Number(d.slice(0,-1)+'.'+d.slice(-1));if(n<=100)return n}return null}
function parseLabelText(text,docType='nutrition'){
 const raw=String(text||'').replace(/\r/g,'');const lines=raw.split('\n').map(x=>x.trim()).filter(Boolean);const out={},fieldConfidence={},evidence={},suggestions={},warnings=[];
 for(const key of ['fat','carbs','sugars','fiber','protein','salt']){const x=strictRowValue(lines,key);if(x){out[key]=x.value;fieldConfidence[key]=88;evidence[key]=x.row}}
 let e=strictRowValue(lines,'kcal');if(!e){const m=[...raw.matchAll(/(\d{2,4})\s*kcal/gi)].map(x=>num(x[1])).find(x=>x>=20&&x<=1000);if(m!=null)e={value:m,row:'kcal'}}if(e){out.kcal=e.value;fieldConfidence.kcal=92;evidence.kcal=e.row}
 out.pac=findDirect(raw,[/\bPAC\s*[:=\-]?\s*(\d{1,4}(?:[.,]\d+)?)/i],1000);out.pod=findDirect(raw,[/\bPOD\s*[:=\-]?\s*(\d{1,4}(?:[.,]\d+)?)/i],1000);
 out.solids=findDirect(raw,[/(?:sostanza\s+secca|dry\s+matter|solidi\s+totali)[^\d\n]{0,30}(\d{1,3}(?:[.,]\d+)?)\s*%?/i],100);out.water=findDirect(raw,[/(?:umidit[aà]|moisture|acqua)[^\d\n]{0,30}(\d{1,3}(?:[.,]\d+)?)\s*%?/i],100);
 for(const k of ['pac','pod','solids','water'])if(out[k]!=null){fieldConfidence[k]=94;evidence[k]='dato tecnico rilevato'}
 // Reject semantically impossible values instead of presenting false certainty.
 for(const k of ['fat','carbs','sugars','fiber','protein','salt'])if(out[k]!=null&&(out[k]<0||out[k]>100)){delete out[k];fieldConfidence[k]=0;warnings.push(`${k}: OCR incompatibile con 0–100 g/100 g; campo lasciato vuoto.`)}
 if(out.sugars!=null&&out.carbs!=null&&out.sugars>out.carbs+0.2){warnings.push('Zuccheri superiori ai carboidrati: valore zuccheri scartato.');delete out.sugars;fieldConfidence.sugars=0}
 if(out.solids!=null&&out.water!=null&&Math.abs(out.solids+out.water-100)>2)warnings.push('Sostanza secca + umidità non è circa 100%.');
 // Detect common OCR loss of decimal separator (e.g. 920 for 92,0), but only suggest it: never auto-apply.
 for(const key of ['fat','carbs','sugars','fiber','protein','salt']){if(out[key]!=null)continue;const row=rowFor(lines,key);if(!row)continue;for(const t of tokens(row.line)){if(t.n>100){const p=possibleDecimal(t.raw,key);if(p!=null)suggestions[key]={value:p,reason:`OCR '${t.raw}' potrebbe significare ${String(p).replace('.',',')} g`}}}}
 const per100=/(?:per|su|on|auf|sur|en|op|na|pa)\s*100\s*g|100\s*g\s*(?:di prodotto|product)/i.test(raw);if(!per100)warnings.push('Riferimento per 100 g non riconosciuto con certezza.');
 const found=Object.keys(out).filter(k=>!['ingredientsText'].includes(k));const avg=found.length?Math.round(found.reduce((a,k)=>a+(fieldConfidence[k]||50),0)/found.length):0;
 return {fields:out,found,fieldConfidence,evidence,suggestions,warnings,per100Detected:per100,parserConfidence:avg,documentType:docType}
}
function dataUrlBuffer(dataUrl){const m=String(dataUrl||'').match(/^data:image\/[^;]+;base64,(.+)$/);if(!m)throw new Error('invalid image');return Buffer.from(m[1],'base64')}
async function imageVariants(dataUrl){const b=dataUrlBuffer(dataUrl);const base=sharp(b,{failOn:'none'}).rotate().resize({width:1800,withoutEnlargement:true});return [
 {name:'originale',buf:await base.clone().jpeg({quality:92}).toBuffer()},
 {name:'grayscale',buf:await base.clone().grayscale().normalize().sharpen().jpeg({quality:92}).toBuffer()},
 {name:'alto contrasto',buf:await base.clone().grayscale().normalize().linear(1.7,-70).sharpen().threshold(165).png().toBuffer()},
 {name:'etichetta colorata',buf:await base.clone().grayscale().normalize().negate().linear(1.4,-30).threshold(135).png().toBuffer()}
]}
function variantScore(parsed,ocrConfidence){const valid=Object.keys(parsed.fields||{}).filter(k=>['kcal','fat','carbs','sugars','fiber','protein','salt','pac','pod','solids','water'].includes(k)).length;const core=['fat','carbs','sugars','protein','salt'].filter(k=>parsed.fields?.[k]!=null).length;return valid*18+core*8+(parsed.per100Detected?18:0)+(ocrConfidence||0)*0.25-(parsed.warnings?.length||0)*8}
function mergeParsed(results){const best=[...results].sort((a,b)=>b.score-a.score)[0];const fields={},fieldConfidence={},evidence={},suggestions={},warnings=[];for(const key of ['kcal','fat','carbs','sugars','fiber','protein','salt','pac','pod','solids','water']){const cand=results.filter(r=>r.parsed.fields?.[key]!=null).sort((a,b)=>(b.parsed.fieldConfidence?.[key]||0)-(a.parsed.fieldConfidence?.[key]||0));if(cand[0]){fields[key]=cand[0].parsed.fields[key];fieldConfidence[key]=Math.min(98,cand[0].parsed.fieldConfidence[key]||70);evidence[key]=`${cand[0].name}: ${cand[0].parsed.evidence?.[key]||''}`}}
 for(const r of results)for(const [k,v] of Object.entries(r.parsed.suggestions||{}))if(fields[k]==null&&!suggestions[k])suggestions[k]=v;
 if(fields.sugars!=null&&fields.carbs!=null&&fields.sugars>fields.carbs+0.2){delete fields.sugars;fieldConfidence.sugars=0;warnings.push('Zuccheri incoerenti con carboidrati: campo lasciato vuoto.')}
 for(const r of results)for(const w of r.parsed.warnings||[])if(!warnings.includes(w))warnings.push(w);
 const found=Object.keys(fields);const avg=found.length?Math.round(found.reduce((a,k)=>a+(fieldConfidence[k]||50),0)/found.length):0;return {fields,fieldConfidence,evidence,suggestions,warnings,found,parserConfidence:avg,per100Detected:results.some(r=>r.parsed.per100Detected),bestVariant:best?.name||'originale',text:best?.text||'',confidence:Math.round(best?.confidence||0),variantDiagnostics:results.map(r=>({name:r.name,confidence:Math.round(r.confidence||0),score:Math.round(r.score),found:r.parsed.found}))}}

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
 if(req.url==='/api/health'){await pool.query('SELECT 1');return send(res,200,{ok:true,version:'0.7.4'})}
 if(req.url==='/api/ocr'&&req.method==='POST'){
  const b=await body(req); const imgs=Array.isArray(b?.imageDataUrls)?b.imageDataUrls.filter(Boolean):(b?.imageDataUrl?[b.imageDataUrl]:[]);if(!imgs.length)return send(res,400,{ok:false,error:'image required'});
  const w=await ocrWorker();const all=[];for(const image of imgs.slice(0,4)){for(const v of await imageVariants(image)){const r=await w.recognize(v.buf);const parsed=parseLabelText(r.data.text,b.documentType||'nutrition');all.push({name:v.name,text:r.data.text,confidence:r.data.confidence||0,parsed,score:variantScore(parsed,r.data.confidence||0)})}}
  return send(res,200,{ok:true,...mergeParsed(all),documentType:b.documentType||'nutrition',imageCount:imgs.length});
 }
 if(req.url==='/api/integrity'&&req.method==='GET'){return send(res,200,await integrityReport())}
 if(req.url==='/api/export'&&req.method==='GET'){const x=await loadState();return send(res,200,{format:'icec-lab-export',version:'0.7.4',exportedAt:new Date().toISOString(),...x},{'content-disposition':'attachment; filename=icec-lab-export.json'})}
 if(req.url==='/api/state'&&req.method==='GET'){return send(res,200,{ok:true,...await loadState()})}
 if(req.url==='/api/state'&&req.method==='PUT'){const b=await body(req);if(!b?.state||typeof b.state!=='object')return send(res,400,{ok:false,error:'invalid state'});const counts=await replaceState(b.state);return send(res,200,{ok:true,counts})}
 send(res,404,{ok:false,error:'not found'});
 }catch(e){console.error(e);send(res,500,{ok:false,error:e.message})}});
server.listen(3001,'0.0.0.0',()=>console.log('IceC API v0.7.4 listening on 3001'));
