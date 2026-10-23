-- Optional authenticated collaboration. No anonymous document access.
create schema if not exists traceledger_private;
revoke all on schema traceledger_private from public;
grant usage on schema traceledger_private to authenticated;
create table public.tl_workspaces (
 id uuid primary key default gen_random_uuid(), name text not null check(length(btrim(name)) between 1 and 100),
 owner_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.tl_members (
 workspace_id uuid not null references public.tl_workspaces(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('reviewer','viewer')), created_at timestamptz not null default now(), primary key(workspace_id,user_id)
);
create index tl_workspaces_owner on public.tl_workspaces(owner_id);
create index tl_members_user on public.tl_members(user_id);
create table public.tl_documents (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.tl_workspaces(id),
 source_key text not null check(length(source_key) between 1 and 100), version integer not null check(version>0), snapshot jsonb not null,
 updated_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(workspace_id,source_key)
);
create table public.tl_events (
 id bigint generated always as identity primary key, workspace_id uuid not null references public.tl_workspaces(id),
 document_id uuid not null references public.tl_documents(id), version integer not null check(version>0), actor_id uuid not null references auth.users(id),
 action text not null check(action in ('saved','reviewed','needs_changes')), note text not null check(length(note)<=2000), created_at timestamptz not null default now()
);
create index tl_documents_actor on public.tl_documents(updated_by);
create index tl_events_actor on public.tl_events(actor_id);
create index tl_events_workspace on public.tl_events(workspace_id,created_at desc);
create index tl_events_document on public.tl_events(document_id);
alter table public.tl_workspaces enable row level security;
alter table public.tl_members enable row level security;
alter table public.tl_documents enable row level security;
alter table public.tl_events enable row level security;
revoke all on public.tl_workspaces,public.tl_members,public.tl_documents,public.tl_events from anon,authenticated;
grant select on public.tl_workspaces,public.tl_members,public.tl_documents,public.tl_events to authenticated;
grant insert on public.tl_workspaces,public.tl_members to authenticated;
grant delete on public.tl_members to authenticated;

-- Membership lookup avoids recursive RLS. Caller identity always comes from JWT.
create function traceledger_private.workspace_role(p_workspace uuid) returns text
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then return null; end if;
 if exists(select 1 from public.tl_workspaces where id=p_workspace and owner_id=auth.uid()) then return 'owner'; end if;
 return (select role from public.tl_members where workspace_id=p_workspace and user_id=auth.uid());
end $$;
revoke all on function traceledger_private.workspace_role(uuid) from public;
grant execute on function traceledger_private.workspace_role(uuid) to authenticated;
create policy tl_workspace_read on public.tl_workspaces for select to authenticated using(owner_id=(select auth.uid()) or traceledger_private.workspace_role(id) is not null);
create policy tl_workspace_create on public.tl_workspaces for insert to authenticated with check(owner_id=(select auth.uid()));
create policy tl_member_read on public.tl_members for select to authenticated using(traceledger_private.workspace_role(workspace_id) is not null);
create policy tl_member_add on public.tl_members for insert to authenticated with check(traceledger_private.workspace_role(workspace_id)='owner');
create policy tl_member_remove on public.tl_members for delete to authenticated using(traceledger_private.workspace_role(workspace_id)='owner');
create policy tl_document_read on public.tl_documents for select to authenticated using(traceledger_private.workspace_role(workspace_id) is not null);
create policy tl_event_read on public.tl_events for select to authenticated using(traceledger_private.workspace_role(workspace_id) is not null);

create function traceledger_private.save_document(p_workspace uuid,p_source_key text,p_snapshot jsonb,p_expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare doc public.tl_documents; fields jsonb='[]'; items jsonb='[]'; entry jsonb; safe jsonb; keys text[]='{}'; actor uuid=auth.uid();
begin
 if actor is null or coalesce(traceledger_private.workspace_role(p_workspace),'') not in ('owner','reviewer') then raise exception 'Reviewer access required'; end if;
 -- Serialize writes per workspace, including the record count and new source keys.
 perform 1 from public.tl_workspaces where id=p_workspace for update;
 if p_expected_version is null or p_expected_version<0 or p_source_key is null or length(p_source_key) not between 1 and 100 then raise exception 'Invalid save identity'; end if;
 if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or octet_length(p_snapshot::text)>250000 then raise exception 'Snapshot must be an object under 250 KB'; end if;
 if jsonb_typeof(p_snapshot->'id') is distinct from 'string' or length(p_snapshot->>'id') not between 1 and 100
 or jsonb_typeof(p_snapshot->'name') is distinct from 'string' or length(p_snapshot->>'name') not between 1 and 200
 or coalesce(p_snapshot->>'type','') not in ('invoice','purchase_order','email','receipt')
 or jsonb_typeof(p_snapshot->'text') is distinct from 'string' or length(p_snapshot->>'text')>40000
 or jsonb_typeof(p_snapshot->'fields') is distinct from 'array' or jsonb_typeof(p_snapshot->'items') is distinct from 'array' then raise exception 'Invalid document snapshot'; end if;
 if jsonb_array_length(p_snapshot->'fields')>20 or jsonb_array_length(p_snapshot->'items')>100 then raise exception 'Snapshot exceeds field or item limit'; end if;
 for entry in select value from jsonb_array_elements(p_snapshot->'fields') loop
  if jsonb_typeof(entry)<>'object' or coalesce(entry->>'key','') !~ '^[a-z][a-z0-9_]{0,39}$'
  or (entry->>'key')=any(keys) or jsonb_typeof(entry->'label') is distinct from 'string' or length(entry->>'label')>80
  or coalesce(entry->>'type','') not in ('text','number','date','email') or jsonb_typeof(entry->'required') is distinct from 'boolean'
  or jsonb_typeof(entry->'value') is distinct from 'string' or length(entry->>'value')>40000
  or jsonb_typeof(entry->'evidence') is distinct from 'string' or length(entry->>'evidence')>40000 then raise exception 'Invalid or duplicate field'; end if;
  keys=array_append(keys,entry->>'key');
  fields=fields || jsonb_build_array(jsonb_build_object('key',entry->'key','label',entry->'label','type',entry->'type','required',entry->'required','value',entry->'value','evidence',entry->'evidence','reviewed',false));
 end loop;
 for entry in select value from jsonb_array_elements(p_snapshot->'items') loop
  if jsonb_typeof(entry)<>'object' or jsonb_typeof(entry->'description') is distinct from 'string'
  or jsonb_typeof(entry->'quantity') is distinct from 'string' or jsonb_typeof(entry->'unit_price') is distinct from 'string'
  or jsonb_typeof(entry->'amount') is distinct from 'string' or jsonb_typeof(entry->'evidence') is distinct from 'string' then raise exception 'Invalid line item'; end if;
  items=items || jsonb_build_array(jsonb_build_object('description',entry->'description','quantity',entry->'quantity','unit_price',entry->'unit_price','amount',entry->'amount','evidence',entry->'evidence','reviewed',false));
 end loop;
 -- Whitelist imported properties, discard claimed approvals and local audit actors.
 safe=jsonb_build_object('id',p_snapshot->'id','name',p_snapshot->'name','type',p_snapshot->'type','text',p_snapshot->'text','fields',fields,'items',items,'audit','[]'::jsonb,'status',case when jsonb_array_length(fields)>0 then 'review' else 'unprocessed' end,'ingestion','Shared workspace snapshot');
 select * into doc from public.tl_documents where workspace_id=p_workspace and source_key=p_source_key for update;
 if found then
  if doc.version<>p_expected_version then raise exception 'Revision conflict. Refresh and load the latest shared copy before saving.'; end if;
  update public.tl_documents set snapshot=safe,version=version+1,updated_by=actor,updated_at=clock_timestamp() where id=doc.id returning * into doc;
 else
  if p_expected_version<>0 then raise exception 'Shared record no longer exists. Refresh the workspace.'; end if;
  if (select count(*) from public.tl_documents where workspace_id=p_workspace)>=100 then raise exception 'Workspace limit of 100 documents reached'; end if;
  insert into public.tl_documents(workspace_id,source_key,version,snapshot,updated_by) values(p_workspace,p_source_key,1,safe,actor) returning * into doc;
 end if;
 insert into public.tl_events(workspace_id,document_id,version,actor_id,action,note) values(p_workspace,doc.id,doc.version,actor,'saved',safe->>'name');
 return to_jsonb(doc);
end $$;
create function public.tl_save_document(p_workspace uuid,p_source_key text,p_snapshot jsonb,p_expected_version integer) returns jsonb
language sql security invoker set search_path='' as $$ select traceledger_private.save_document(p_workspace,p_source_key,p_snapshot,p_expected_version) $$;
revoke all on function traceledger_private.save_document(uuid,text,jsonb,integer),public.tl_save_document(uuid,text,jsonb,integer) from public;
grant execute on function traceledger_private.save_document(uuid,text,jsonb,integer),public.tl_save_document(uuid,text,jsonb,integer) to authenticated;

create function traceledger_private.record_review(p_document uuid,p_expected_version integer,p_decision text,p_note text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare doc public.tl_documents; event public.tl_events; actor uuid=auth.uid();
begin
 select * into doc from public.tl_documents where id=p_document for update;
 if actor is null or not found or coalesce(traceledger_private.workspace_role(doc.workspace_id),'') not in ('owner','reviewer') then raise exception 'Reviewer access required'; end if;
 if p_expected_version is null or doc.version<>p_expected_version then raise exception 'Revision conflict. Refresh before reviewing.'; end if;
 if p_decision is null or p_decision not in ('reviewed','needs_changes') or p_note is null or length(btrim(p_note)) not between 1 and 2000 then raise exception 'Choose a valid decision and add a review note (1–2000 characters)'; end if;
 insert into public.tl_events(workspace_id,document_id,version,actor_id,action,note) values(doc.workspace_id,doc.id,doc.version,actor,p_decision,btrim(p_note)) returning * into event;
 return to_jsonb(event);
end $$;
create function public.tl_record_review(p_document uuid,p_expected_version integer,p_decision text,p_note text) returns jsonb
language sql security invoker set search_path='' as $$ select traceledger_private.record_review(p_document,p_expected_version,p_decision,p_note) $$;
revoke all on function traceledger_private.record_review(uuid,integer,text,text),public.tl_record_review(uuid,integer,text,text) from public;
grant execute on function traceledger_private.record_review(uuid,integer,text,text),public.tl_record_review(uuid,integer,text,text) to authenticated;
