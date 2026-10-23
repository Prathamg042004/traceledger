import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {cloudSnapshot,editSharedCopy,saveIdentity} from '../lib/cloud/model.mjs';
const owner='10000000-0000-4000-8000-000000000001',reviewer='10000000-0000-4000-8000-000000000002',viewer='10000000-0000-4000-8000-000000000003',outsider='10000000-0000-4000-8000-000000000004';
const document={id:'local-1',name:'Invoice',type:'invoice',text:'Invoice 123',status:'approved',fields:[{key:'invoice_id',label:'Invoice ID',type:'text',required:true,value:'123',evidence:'Invoice 123',reviewed:true}],items:[],audit:[{time:new Date().toISOString(),action:'Approved locally'}]};
test('shared copies clear local approvals, preserve revision identity, and get a fresh local ID',()=>{
 const snapshot=cloudSnapshot(document);assert.equal(snapshot.status,'review');assert.equal(snapshot.fields[0].reviewed,false);assert.deepEqual(snapshot.audit,[]);
 const record={id:owner,workspace_id:reviewer,source_key:'local-1',version:3,snapshot};const copy=editSharedCopy(record);assert.notEqual(copy.id,document.id);assert.deepEqual(saveIdentity(copy,reviewer),{sourceKey:'local-1',expectedVersion:3});assert.deepEqual(saveIdentity(copy,viewer),{sourceKey:copy.id,expectedVersion:0});
});
test('Postgres enforces workspace isolation, roles, revision conflicts and server-assigned history',async()=>{
 const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;insert into auth.users values('${owner}'),('${reviewer}'),('${viewer}'),('${outsider}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261023193148_shared_workspaces.sql',import.meta.url),'utf8'));
 async function as(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
 await as(owner);
 const wid=(await db.query('insert into public.tl_workspaces(name,owner_id) values($1,$2) returning id',['Team',owner])).rows[0].id;
 await assert.rejects(db.query('insert into public.tl_workspaces(name,owner_id) values($1,$2)',['Spoof',reviewer]),/row-level security/);
 await db.query('insert into public.tl_members(workspace_id,user_id,role) values($1,$2,$3),($1,$4,$5)',[wid,reviewer,'reviewer',viewer,'viewer']);
 const save=async(version=0,doc=document)=>(await db.query('select public.tl_save_document($1,$2,$3::jsonb,$4) as result',[wid,'local-1',JSON.stringify(doc),version])).rows[0].result;
 await as(reviewer);const first=await save();assert.equal(first.version,1);assert.equal(first.updated_by,reviewer);assert.equal(first.snapshot.status,'review');assert.equal(first.snapshot.fields[0].reviewed,false);assert.deepEqual(first.snapshot.audit,[]);
 await assert.rejects(save(),/Revision conflict/);
 await assert.rejects(db.query('insert into public.tl_members(workspace_id,user_id,role) values($1,$2,$3)',[wid,outsider,'reviewer']),/row-level security/);
 await assert.rejects(db.query('update public.tl_members set role=$1 where user_id=$2',['reviewer',viewer]),/permission denied/);
 const review=(version=1,decision='reviewed',note='Checked source evidence')=>db.query('select public.tl_record_review($1,$2,$3,$4) as result',[first.id,version,decision,note]);
 const event=(await review()).rows[0].result;assert.equal(event.actor_id,reviewer);assert.equal(event.version,1);assert.ok(event.created_at);
 await assert.rejects(review(0),/Revision conflict/);await assert.rejects(review(1,'approved'),/valid decision/);await assert.rejects(review(1,'reviewed',' '),/valid decision/);
 const second=await save(1);assert.equal(second.version,2);await assert.rejects(review(1),/Revision conflict/);
 await assert.rejects(save(2,{...document,fields:[document.fields[0],document.fields[0]]}),/duplicate field/);
 await as(viewer);assert.equal((await db.query('select * from public.tl_documents')).rows.length,1);await assert.rejects(save(2),/Reviewer access required/);await assert.rejects(review(2),/Reviewer access required/);
 await as(outsider);for(const table of ['tl_workspaces','tl_members','tl_documents','tl_events'])assert.equal((await db.query(`select * from public.${table}`)).rows.length,0);await assert.rejects(save(2),/Reviewer access required/);await assert.rejects(review(2),/Reviewer access required/);
 await as(owner);await assert.rejects(db.exec('delete from public.tl_events'),/permission denied/);await assert.rejects(db.exec("update public.tl_documents set version=99"),/permission denied/);
 assert.equal((await db.query('select * from public.tl_events')).rows.length,3);
 await db.query('delete from public.tl_members where workspace_id=$1 and user_id=$2',[wid,viewer]);await as(viewer);assert.equal((await db.query('select * from public.tl_documents')).rows.length,0);
 await db.exec('reset role;set role anon');await assert.rejects(db.exec('select * from public.tl_documents'),/permission denied/);await assert.rejects(save(),/permission denied/);
 await db.exec('reset role');const tables=(await db.query("select relrowsecurity from pg_class where relname in ('tl_workspaces','tl_members','tl_documents','tl_events')")).rows;assert.equal(tables.length,4);assert.ok(tables.every(r=>r.relrowsecurity));
 }finally{await db.close();}
});
