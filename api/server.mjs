import http from 'node:http';
import pg from 'pg';
const {Pool}=pg;
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const USER_EMAIL='local@icec.lab';
async function userId(client=pool){const r=await client.query("SELECT id FROM app_users WHERE email=$1",[USER_EMAIL]);return r.rows[0]?.id}
function send(res,status,data,extra={}){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra});res.end(JSON.stringify(data))}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>10_000_000)throw new Error('payload too large')}return s?JSON.parse(s):{}}
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
 if(req.url==='/api/health'){await pool.query('SELECT 1');return send(res,200,{ok:true,version:'0.3.1'})}
 if(req.url==='/api/integrity'&&req.method==='GET'){return send(res,200,await integrityReport())}
 if(req.url==='/api/export'&&req.method==='GET'){const x=await loadState();return send(res,200,{format:'icec-lab-export',version:'0.3.1',exportedAt:new Date().toISOString(),...x},{'content-disposition':'attachment; filename=icec-lab-export.json'})}
 if(req.url==='/api/state'&&req.method==='GET'){return send(res,200,{ok:true,...await loadState()})}
 if(req.url==='/api/state'&&req.method==='PUT'){const b=await body(req);if(!b?.state||typeof b.state!=='object')return send(res,400,{ok:false,error:'invalid state'});const counts=await replaceState(b.state);return send(res,200,{ok:true,counts})}
 send(res,404,{ok:false,error:'not found'});
 }catch(e){console.error(e);send(res,500,{ok:false,error:e.message})}});
server.listen(3001,'0.0.0.0',()=>console.log('IceC API v0.3.1 listening on 3001'));
