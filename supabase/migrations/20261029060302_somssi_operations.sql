-- Additive, isolated SOMSSI tables. No existing application tables are altered.
create schema if not exists somssi_private;
revoke all on schema somssi_private from public;
grant usage on schema somssi_private to authenticated;
create table public.somssi_projects (
  id uuid primary key default gen_random_uuid(), name text not null,
  deadline timestamptz not null default '2026-11-23 14:00:00+09',
  budget_won bigint not null default 2000000 check (budget_won between 0 and 1000000000),
  created_at timestamptz not null default now()
);
create table public.somssi_project_members (
  project_id uuid not null references public.somssi_projects(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','admin','editor','viewer')),
  active boolean not null default true, primary key(project_id,user_id)
);
create table public.somssi_records (
  id uuid primary key, project_id uuid not null references public.somssi_projects(id),
  kind text not null, payload jsonb not null check(jsonb_typeof(payload)='object'),
  version integer not null default 1 check(version>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id), unique(project_id,id)
);
create index somssi_records_project_kind on public.somssi_records(project_id,kind);
create unique index somssi_allocation_category on public.somssi_records(project_id,(payload->>'fund'),(payload->>'category')) where kind='allocations';
create table public.somssi_record_links (
  project_id uuid not null, record_id uuid not null, field text not null, target_id uuid not null,
  foreign key(project_id,record_id) references public.somssi_records(project_id,id),
  foreign key(project_id,target_id) references public.somssi_records(project_id,id),
  primary key(record_id,field,target_id)
);
create table public.somssi_audit_logs (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.somssi_projects(id),
  actor_id uuid, entity_table text not null, entity_id text not null,
  action text not null, before_value jsonb, after_value jsonb, occurred_at timestamptz not null default now()
);
create index somssi_audit_project_time on public.somssi_audit_logs(project_id,occurred_at);
create table somssi_private.kind_rules(kind text primary key, fields jsonb not null, immutable boolean not null);

alter table public.somssi_projects enable row level security;
alter table public.somssi_project_members enable row level security;
alter table public.somssi_records enable row level security;
alter table public.somssi_record_links enable row level security;
alter table public.somssi_audit_logs enable row level security;
alter table somssi_private.kind_rules enable row level security;
create policy own_membership on public.somssi_project_members for select to authenticated using(user_id=(select auth.uid()) and active);
create policy member_project on public.somssi_projects for select to authenticated using(exists(select 1 from public.somssi_project_members m where m.project_id=id and m.user_id=(select auth.uid()) and m.active));
create policy member_records on public.somssi_records for select to authenticated using(exists(select 1 from public.somssi_project_members m where m.project_id=somssi_records.project_id and m.user_id=(select auth.uid()) and m.active and (somssi_records.kind<>'evidence' or m.role in ('owner','admin') or (m.role='editor' and somssi_records.created_by=m.user_id))));
create policy member_links on public.somssi_record_links for select to authenticated using(exists(select 1 from public.somssi_project_members m where m.project_id=somssi_record_links.project_id and m.user_id=(select auth.uid()) and m.active));
create policy admin_audit on public.somssi_audit_logs for select to authenticated using(exists(select 1 from public.somssi_project_members m where m.project_id=somssi_audit_logs.project_id and m.user_id=(select auth.uid()) and m.active and m.role in ('owner','admin')));
revoke all on public.somssi_projects, public.somssi_project_members, public.somssi_records, public.somssi_record_links, public.somssi_audit_logs from anon, authenticated;
grant select on public.somssi_projects, public.somssi_project_members, public.somssi_records, public.somssi_record_links, public.somssi_audit_logs to authenticated;

create function somssi_private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  insert into public.somssi_audit_logs(project_id,actor_id,entity_table,entity_id,action,before_value,after_value)
  values(coalesce((to_jsonb(new)->>'project_id')::uuid,(to_jsonb(new)->>'id')::uuid), auth.uid(),tg_table_name,
    coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'user_id'),tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
  return new;
end; $$;
revoke all on function somssi_private.audit_change() from public,anon,authenticated;
create trigger audit_records after insert or update on public.somssi_records for each row execute function somssi_private.audit_change();
create trigger audit_projects after insert or update on public.somssi_projects for each row execute function somssi_private.audit_change();
create trigger audit_members after insert or update on public.somssi_project_members for each row execute function somssi_private.audit_change();

-- Private writer is the only data mutation entrypoint. Explicit actor/project/role checks
-- are mandatory because authenticated roles have no direct table write permissions.
create function somssi_private.write_record(p_project_id uuid,p_id uuid,p_kind text,p_payload jsonb,p_expected_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid:=auth.uid(); member_role text; current_row public.somssi_records; rules jsonb;
  f jsonb; v jsonb; field_key text; target uuid; target_kind text; original public.somssi_records;
  amount bigint; net bigint; target_payload jsonb; old_links jsonb;
begin
  if actor is null then raise exception 'AUTH_REQUIRED' using errcode='42501'; end if;
  select role into member_role from public.somssi_project_members where project_id=p_project_id and user_id=actor and active;
  if member_role is null or member_role='viewer' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  -- Serializes writes within a project: correction totals and cross-record invariants cannot race.
  perform 1 from public.somssi_projects where id=p_project_id for update;
  select fields into rules from somssi_private.kind_rules where kind=p_kind;
  if rules is null or jsonb_typeof(p_payload) is distinct from 'object' or p_expected_version is null or p_expected_version<0 or p_id is null or length(p_payload::text)>131072 then raise exception 'INVALID_PAYLOAD' using errcode='22023'; end if;
  if exists(select 1 from jsonb_object_keys(p_payload) k where not exists(select 1 from jsonb_array_elements(rules) as rule_entry where rule_entry->>'key'=k)) then raise exception 'UNKNOWN_FIELD' using errcode='22023'; end if;
  for f in select * from jsonb_array_elements(rules) loop
    field_key:=f->>'key'; v:=p_payload->field_key;
    if v is null then raise exception 'MISSING_FIELD: %',field_key using errcode='22023'; end if;
    if v='null'::jsonb then
      if coalesce((f->>'required')::boolean,false) or f->>'type' in ('boolean','select','refs') then raise exception 'REQUIRED_FIELD: %',field_key using errcode='22023'; end if;
      continue;
    end if;
    if f->>'type'='number' then
      if jsonb_typeof(v)<>'number' or (v#>>'{}') !~ '^-?[0-9]+$' then raise exception 'INTEGER_REQUIRED: %',field_key using errcode='22023'; end if;
      if (v#>>'{}')::numeric<coalesce((f->>'min')::numeric,0) or (v#>>'{}')::numeric>coalesce((f->>'max')::numeric,1000000000) then raise exception 'NUMBER_RANGE: %',field_key using errcode='22023'; end if;
    elsif f->>'type'='boolean' then
      if jsonb_typeof(v)<>'boolean' then raise exception 'BOOLEAN_REQUIRED' using errcode='22023'; end if;
    elsif f->>'type'='refs' then
      if jsonb_typeof(v)<>'array' or jsonb_array_length(v)>100 or (coalesce((f->>'required')::boolean,false) and jsonb_array_length(v)=0) then raise exception 'ARRAY_REQUIRED' using errcode='22023'; end if;
      if (select count(*) from jsonb_array_elements(v))<>(select count(distinct a) from jsonb_array_elements(v) a) then raise exception 'DUPLICATE_REFERENCE' using errcode='22023'; end if;
    else
      if jsonb_typeof(v)<>'string' or length(v#>>'{}')>(case when f->>'type'='textarea' then 8000 else 500 end) or (coalesce((f->>'required')::boolean,false) and length(btrim(v#>>'{}'))=0) then raise exception 'TEXT_REQUIRED: %',field_key using errcode='22023'; end if;
      if f->>'type'='select' and not (f->'options' @> jsonb_build_array(v)) then raise exception 'INVALID_OPTION: %',field_key using errcode='22023'; end if;
      if f->>'type'='date' then
        if (v#>>'{}') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'DATE_REQUIRED' using errcode='22023'; end if;
        perform (v#>>'{}')::date;
      end if;
      if f->>'type'='datetime' then
        if (v#>>'{}') !~ 'T.*(Z|[+-][0-9]{2}:[0-9]{2})$' then raise exception 'DATETIME_OFFSET_REQUIRED' using errcode='22023'; end if;
        perform (v#>>'{}')::timestamptz;
      end if;
    end if;
    if f->>'ref' is not null then
      for target in select value::uuid from jsonb_array_elements_text(case when f->>'type'='refs' then v else jsonb_build_array(v) end) loop
        select kind into target_kind from public.somssi_records where project_id=p_project_id and id=target;
        if target=p_id or target_kind is distinct from f->>'ref' then raise exception 'INVALID_REFERENCE: %',field_key using errcode='23503'; end if;
      end loop;
    end if;
  end loop;
  select * into current_row from public.somssi_records where id=p_id for update;
  if found then
    if current_row.project_id<>p_project_id or current_row.kind<>p_kind then raise exception 'FORBIDDEN' using errcode='42501'; end if;
    if current_row.version<>p_expected_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
    if (select immutable from somssi_private.kind_rules where kind=p_kind) or (p_kind='payments' and current_row.payload->>'status'='paid') then raise exception 'IMMUTABLE_RECORD' using errcode='42501'; end if;
    if member_role='editor' and current_row.created_by<>actor then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  elsif p_expected_version<>0 then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;
  if p_kind='expenseReviews' and member_role not in ('owner','admin') then raise exception 'SETTLEMENT_REQUIRES_ADMIN' using errcode='42501'; end if;
  if p_kind='tasks' and ((p_payload->>'status'='done') is distinct from (p_payload->>'completedAt' is not null)) then raise exception 'COMPLETION_DATE_REQUIRED' using errcode='22023'; end if;
  if p_kind='scenarios' and p_payload->>'kind'='confirmed' and (p_payload->>'priceWon' is null or p_payload->>'capacity' is null) then raise exception 'CONFIRMED_PRODUCT_REQUIRES_PRICE' using errcode='22023'; end if;
  if p_kind='milestones' and p_payload->>'start'>p_payload->>'end' then raise exception 'INVALID_DATE_RANGE' using errcode='22023'; end if;
  if p_kind='pilots' then
    if (p_payload->>'successful')::int>(p_payload->>'attended')::int or (p_payload->>'satisfactionResponses')::int>(p_payload->>'attended')::int then raise exception 'PARTICIPANT_RANGE' using errcode='22023'; end if;
    if p_payload->>'status'='planned' and ((p_payload->>'attended')::int<>0 or (p_payload->>'satisfactionResponses')::int<>0 or p_payload->>'successful' is not null) then raise exception 'PLANNED_IS_NOT_ACTUAL' using errcode='22023'; end if;
    if ((p_payload->>'satisfactionResponses')::int=0) is distinct from (p_payload->>'satisfactionTotal' is null) then raise exception 'SATISFACTION_DENOMINATOR' using errcode='22023'; end if;
    if (p_payload->>'satisfactionTotal')::int<(p_payload->>'satisfactionResponses')::int or (p_payload->>'satisfactionTotal')::int>5*(p_payload->>'satisfactionResponses')::int then raise exception 'SATISFACTION_RANGE' using errcode='22023'; end if;
  end if;
  if p_kind='payments' then
    select payload into target_payload from public.somssi_records where id=(p_payload->>'participantId')::uuid and project_id=p_project_id;
    if target_payload->>'pilotId' is distinct from p_payload->>'pilotId' then raise exception 'PARTICIPANT_PILOT_MISMATCH' using errcode='23503'; end if;
    if p_payload->>'status'='paid' and (p_payload->>'paidAt' is null or (p_payload->>'amountWon')::bigint<=0) then raise exception 'PAYMENT_DATE_AMOUNT_REQUIRED' using errcode='22023'; end if;
  end if;
  -- Do not reassign a participant already referenced by payments.
  if p_kind='participants' and current_row.id is not null and current_row.payload->>'pilotId' is distinct from p_payload->>'pilotId' and exists(select 1 from public.somssi_record_links where target_id=p_id) then raise exception 'REFERENCED_PARTICIPANT' using errcode='23503'; end if;
  if p_kind='partners' and p_payload->>'stage'='계약' and p_payload->>'contractEvidenceId' is null then raise exception 'CONTRACT_EVIDENCE_REQUIRED' using errcode='22023'; end if;
  if p_kind='partners' then
    if p_payload->>'loiEvidenceId' is not null then
      select payload into target_payload from public.somssi_records where project_id=p_project_id and id=(p_payload->>'loiEvidenceId')::uuid;
      if target_payload->>'evidenceType' is distinct from '협력의향서(LOI)' then raise exception 'LOI_EVIDENCE_TYPE_REQUIRED' using errcode='22023'; end if;
    end if;
    if p_payload->>'contractEvidenceId' is not null then
      select payload into target_payload from public.somssi_records where project_id=p_project_id and id=(p_payload->>'contractEvidenceId')::uuid;
      if target_payload->>'evidenceType' is distinct from '계약서' then raise exception 'CONTRACT_EVIDENCE_TYPE_REQUIRED' using errcode='22023'; end if;
    end if;
  end if;
  if p_kind='expenses' then
    amount:=(p_payload->>'amountWon')::bigint;
    if p_payload->>'correctionOfId' is null then
      if amount<=0 then raise exception 'POSITIVE_EXPENSE_REQUIRED' using errcode='22023'; end if;
    else
      if amount=0 or length(btrim(coalesce(p_payload->>'correctionReason','')))=0 then raise exception 'CORRECTION_REASON_REQUIRED' using errcode='22023'; end if;
      select * into original from public.somssi_records where project_id=p_project_id and id=(p_payload->>'correctionOfId')::uuid;
      if member_role='editor' and original.created_by<>actor then raise exception 'FORBIDDEN' using errcode='42501'; end if;
      if original.payload->>'correctionOfId' is not null or original.payload->>'fund' is distinct from p_payload->>'fund' or original.payload->>'category' is distinct from p_payload->>'category' or original.payload->>'vendor' is distinct from p_payload->>'vendor' or original.payload->>'pilotId' is distinct from p_payload->>'pilotId' then raise exception 'CORRECTION_ORIGINAL_MISMATCH' using errcode='22023'; end if;
      select (original.payload->>'amountWon')::bigint+coalesce(sum((payload->>'amountWon')::bigint),0)+amount into net from public.somssi_records where project_id=p_project_id and kind='expenses' and payload->>'correctionOfId'=original.id::text;
      if net<0 then raise exception 'CORRECTION_EXCEEDS_ORIGINAL' using errcode='22023'; end if;
    end if;
  end if;
  if p_kind='evidence' then
    if p_payload->>'storagePath' not like p_project_id::text||'/'||actor::text||'/'||p_id::text||'.%' or p_payload->>'sha256' !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_STORAGE_PATH' using errcode='22023'; end if;
  end if;
  if current_row.id is null then
    insert into public.somssi_records(id,project_id,kind,payload,created_by) values(p_id,p_project_id,p_kind,p_payload,actor) returning * into current_row;
  else
    update public.somssi_records set payload=p_payload,version=version+1,updated_at=clock_timestamp() where id=p_id returning * into current_row;
    delete from public.somssi_record_links where record_id=p_id;
  end if;
  for f in select * from jsonb_array_elements(rules) where value->>'ref' is not null loop
    v:=p_payload->(f->>'key');
    if v<>'null'::jsonb then
      for target in select value::uuid from jsonb_array_elements_text(case when f->>'type'='refs' then v else jsonb_build_array(v) end) loop
        insert into public.somssi_record_links(project_id,record_id,field,target_id) values(p_project_id,p_id,f->>'key',target);
      end loop;
    end if;
  end loop;
  return to_jsonb(current_row);
end; $$;
revoke all on function somssi_private.write_record(uuid,uuid,text,jsonb,integer) from public,anon;
grant execute on function somssi_private.write_record(uuid,uuid,text,jsonb,integer) to authenticated;
create function public.somssi_write_record(p_project_id uuid,p_id uuid,p_kind text,p_payload jsonb,p_expected_version integer)
returns jsonb language sql security invoker set search_path='' as $$ select somssi_private.write_record(p_project_id,p_id,p_kind,p_payload,p_expected_version); $$;
revoke all on function public.somssi_write_record(uuid,uuid,text,jsonb,integer) from public,anon;
grant execute on function public.somssi_write_record(uuid,uuid,text,jsonb,integer) to authenticated;

-- One statement snapshot: record versions and audit history share the same MVCC snapshot.
create function public.somssi_export_backup(p_project_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  if not exists(select 1 from public.somssi_project_members where project_id=p_project_id and user_id=auth.uid() and active and role in ('owner','admin')) then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return (select jsonb_build_object('format','somssi-backup-v1','exportedAt',now(),'project',(select to_jsonb(p) from public.somssi_projects p where id=p_project_id),'records',coalesce((select jsonb_agg(r order by created_at,id) from public.somssi_records r where project_id=p_project_id),'[]'::jsonb),'audit',coalesce((select jsonb_agg(a order by id) from public.somssi_audit_logs a where project_id=p_project_id),'[]'::jsonb)));
end; $$;
revoke all on function public.somssi_export_backup(uuid) from public,anon;
grant execute on function public.somssi_export_backup(uuid) to authenticated;
-- GENERATED DOMAIN RULES: scripts/build-db-rules.mjs
insert into somssi_private.kind_rules(kind,fields,immutable) values
('people', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"role","label":"담당 역할","type":"text","required":true},{"key":"relationship","label":"구분","type":"select","options":["팀원","외부 협력자","멘토"],"required":true},{"key":"start","label":"참여 시작","type":"date","required":false},{"key":"end","label":"참여 종료","type":"date","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('milestones', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"start","label":"시작일","type":"date","required":true},{"key":"end","label":"목표일","type":"date","required":true},{"key":"status","label":"상태","type":"select","options":["계획","진행 중","확정"],"required":true},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('tasks', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"ownerId","label":"담당자","type":"ref","ref":"people","required":false},{"key":"dueAt","label":"목표 일시","type":"datetime","required":true},{"key":"status","label":"진행 상태","type":"select","options":["todo","in_progress","blocked","done"],"required":true},{"key":"completedAt","label":"실제 완료 일시","type":"datetime","required":false},{"key":"hypothesisId","label":"관련 가설","type":"ref","ref":"hypotheses","required":false},{"key":"milestoneId","label":"관련 마일스톤","type":"ref","ref":"milestones","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('hypotheses', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"goal","label":"검증 목표","type":"textarea","required":true},{"key":"method","label":"실험 방법","type":"textarea","required":true},{"key":"target","label":"목표 수치","type":"number","required":false,"min":0,"max":1000000000},{"key":"actual","label":"측정 결과","type":"number","required":false,"min":0,"max":1000000000},{"key":"unit","label":"측정 단위","type":"text","required":false},{"key":"ownerId","label":"담당자","type":"ref","ref":"people","required":false},{"key":"dueAt","label":"마감","type":"datetime","required":false},{"key":"section","label":"사업계획 반영 위치","type":"select","options":["Q1","Q2","Q3","Q4"],"required":true},{"key":"revision","label":"검증을 통한 수정사항","type":"textarea","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('products', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"description","label":"상품 설명","type":"textarea","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('scenarios', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"productId","label":"상품","type":"ref","ref":"products","required":true},{"key":"kind","label":"상품 구분","type":"select","options":["experiment","confirmed"],"required":true},{"key":"priceWon","label":"1인 판매가격(원)","type":"number","required":false,"min":0,"max":1000000000},{"key":"minutes","label":"진행시간(분)","type":"number","required":true,"min":0,"max":1440},{"key":"capacity","label":"정원","type":"number","required":false,"min":0,"max":10000},{"key":"fixedCostWon","label":"회차 고정비(원)","type":"number","required":false,"min":0,"max":1000000000},{"key":"variableCostWon","label":"인당 변동비(원)","type":"number","required":false,"min":0,"max":1000000000},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('pilots', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"scenarioId","label":"상품 시나리오","type":"ref","ref":"scenarios","required":true},{"key":"date","label":"운영 날짜","type":"date","required":true},{"key":"venue","label":"장소","type":"text","required":true},{"key":"status","label":"실행 상태","type":"select","options":["planned","conducted"],"required":true},{"key":"type","label":"유·무료","type":"select","options":["free","paid"],"required":true},{"key":"applied","label":"신청 인원","type":"number","required":true,"min":0,"max":10000},{"key":"attended","label":"실제 참가 인원","type":"number","required":true,"min":0,"max":10000},{"key":"successful","label":"목표 연주 성공 인원","type":"number","required":false,"min":0,"max":10000},{"key":"satisfactionResponses","label":"만족도 응답 수","type":"number","required":true,"min":0,"max":10000},{"key":"satisfactionTotal","label":"만족도 합계(각 1~5점)","type":"number","required":false,"min":0,"max":50000},{"key":"minutes","label":"실제 운영시간(분)","type":"number","required":false,"min":0,"max":1440},{"key":"problems","label":"운영 문제점","type":"textarea","required":false},{"key":"improvements","label":"개선사항","type":"textarea","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('participants', '[{"key":"title","label":"익명 식별명 (예: P001)","type":"text","required":true},{"key":"pilotId","label":"파일럿","type":"ref","ref":"pilots","required":true},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('surveyForms', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"audience","label":"조사 대상·모집 방법","type":"textarea","required":true},{"key":"questions","label":"설문 문항·선택지","type":"textarea","required":true},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('surveys', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"surveyId","label":"조사 설계","type":"ref","ref":"surveyForms","required":true},{"key":"kind","label":"조사 방식","type":"select","options":["interview","survey"],"required":true},{"key":"respondentId","label":"익명 응답자 코드","type":"text","required":true},{"key":"completed","label":"조사 완료","type":"boolean","required":true},{"key":"purchaseIntent","label":"설문상 구매 의향","type":"select","options":["미응답","예","아니요"],"required":true},{"key":"reservationInquiry","label":"실제 예약 문의","type":"boolean","required":true},{"key":"priceWon","label":"선택 가격(원)","type":"number","required":false,"min":0,"max":1000000000},{"key":"preferredMinutes","label":"선호 시간(분)","type":"number","required":false,"min":0,"max":1440},{"key":"preference","label":"직접 참여·관람","type":"select","options":["미응답","participate","watch"],"required":true},{"key":"visitIncheon","label":"인천 방문 의향","type":"select","options":["미응답","예","아니요"],"required":true},{"key":"culturalLink","label":"역사·문화 연계 선호","type":"select","options":["미응답","예","아니요"],"required":true},{"key":"extraVisit","label":"추가 방문 의향","type":"select","options":["미응답","예","아니요"],"required":true},{"key":"extraSpending","label":"추가 소비 의향","type":"select","options":["미응답","예","아니요"],"required":true},{"key":"overnight","label":"숙박 의향","type":"select","options":["미응답","예","아니요"],"required":true},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('payments', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"pilotId","label":"파일럿","type":"ref","ref":"pilots","required":true},{"key":"participantId","label":"익명 참가자","type":"ref","ref":"participants","required":true},{"key":"status","label":"결제 상태","type":"select","options":["pending","paid"],"required":true},{"key":"amountWon","label":"결제 금액(원)","type":"number","required":true,"min":0,"max":1000000000},{"key":"paidAt","label":"결제일","type":"date","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('partners', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"category","label":"유형","type":"select","options":["지역 예술인","호텔","문화공간","관광사업자","MICE","기타"],"required":true},{"key":"stage","label":"협력 단계","type":"select","options":["후보","접촉","회신","미팅","협의","협력의향","계약"],"required":true},{"key":"loiEvidenceId","label":"협력의향서(LOI)","type":"ref","ref":"evidence","required":false},{"key":"contractEvidenceId","label":"계약서","type":"ref","ref":"evidence","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('interactions', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"partnerId","label":"파트너","type":"ref","ref":"partners","required":true},{"key":"date","label":"날짜","type":"date","required":true},{"key":"result","label":"접촉 내용·결과·역할","type":"textarea","required":true},{"key":"pilotId","label":"참여 회차","type":"ref","ref":"pilots","required":false},{"key":"expenseId","label":"지급 지출","type":"ref","ref":"expenses","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('estimates', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"vendor","label":"거래처","type":"text","required":true},{"key":"received","label":"실제 견적서 확보","type":"boolean","required":true},{"key":"amountWon","label":"견적 금액(원)","type":"number","required":true,"min":0,"max":1000000000},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('allocations', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"fund","label":"자금 (1r/ai/future)","type":"select","options":["1r","ai","future"],"required":true},{"key":"category","label":"공식 비목 (운영기관 확인 필요)","type":"text","required":true},{"key":"amountWon","label":"편성 금액(원)","type":"number","required":true,"min":0,"max":1000000000},{"key":"confirmed","label":"편성 확정","type":"boolean","required":true},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('expenses', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"fund","label":"자금 (1r/ai/future)","type":"select","options":["1r","ai","future"],"required":true},{"key":"vendor","label":"거래처","type":"text","required":true},{"key":"spentAt","label":"집행일","type":"date","required":true},{"key":"category","label":"공식 비목 (운영기관 확인 필요)","type":"text","required":true},{"key":"amountWon","label":"지출/정정 증감액(원)","type":"number","required":true,"min":-1000000000,"max":1000000000},{"key":"pilotId","label":"관련 파일럿","type":"ref","ref":"pilots","required":false},{"key":"correctionOfId","label":"정정할 원거래","type":"ref","ref":"expenses","required":false},{"key":"correctionReason","label":"정정 사유","type":"textarea","required":false},{"key":"receipt","label":"영수증 보유","type":"boolean","required":true},{"key":"settlement","label":"정산 상태","type":"select","options":["unreviewed","pending_documents"],"required":true},{"key":"eligibility","label":"집행 적격성","type":"select","options":["확인 필요","운영기관 확인"],"required":true},{"key":"evidenceType","label":"증빙 유형","type":"text","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, true),
('expenseReviews', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"expenseId","label":"원거래","type":"ref","ref":"expenses","required":true},{"key":"receipt","label":"영수증 보유","type":"boolean","required":true},{"key":"settlement","label":"정산 상태","type":"select","options":["unreviewed","pending_documents","settled"],"required":true},{"key":"notes","label":"검토 사유","type":"textarea","required":true},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('meetings', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"date","label":"회의 일시","type":"datetime","required":true},{"key":"venue","label":"장소","type":"text","required":true},{"key":"attendeeIds","label":"참석자","type":"refs","ref":"people","required":true},{"key":"agenda","label":"안건","type":"textarea","required":true},{"key":"discussion","label":"논의 내용","type":"textarea","required":true},{"key":"decisions","label":"결정사항","type":"textarea","required":true},{"key":"followUp","label":"담당 업무·실행 기한","type":"textarea","required":false},{"key":"receiptIssued","label":"영수증 발급 확인","type":"boolean","required":true},{"key":"expenseId","label":"회의비 지출","type":"ref","ref":"expenses","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('mentoring', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"date","label":"멘토링 날짜","type":"date","required":true},{"key":"mentorId","label":"멘토","type":"ref","ref":"people","required":true},{"key":"completed","label":"실제 진행 완료","type":"boolean","required":true},{"key":"feedback","label":"주요 피드백","type":"textarea","required":true},{"key":"action","label":"실행한 활동","type":"textarea","required":false},{"key":"result","label":"실제 결과","type":"textarea","required":false},{"key":"planRevision","label":"사업계획서 수정사항","type":"textarea","required":false},{"key":"meetingId","label":"관련 회의","type":"ref","ref":"meetings","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('aiUsage', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"solution","label":"솔루션명","type":"text","required":true},{"key":"supportedProgram","label":"지원 프로그램 솔루션","type":"boolean","required":true},{"key":"date","label":"활용 날짜","type":"date","required":true},{"key":"performed","label":"실제 활용 완료","type":"boolean","required":true},{"key":"task","label":"활용 업무","type":"textarea","required":true},{"key":"beforeMinutes","label":"활용 전 작업시간(분)","type":"number","required":false,"min":0,"max":100000},{"key":"afterMinutes","label":"활용 후 작업시간(분)","type":"number","required":false,"min":0,"max":100000},{"key":"costWon","label":"비용(원)","type":"number","required":false,"min":0,"max":1000000000},{"key":"output","label":"결과물","type":"textarea","required":false},{"key":"reviewed","label":"검수 완료","type":"boolean","required":true},{"key":"limitations","label":"오류·한계","type":"textarea","required":false},{"key":"effect","label":"사업계획 개선 효과","type":"textarea","required":false},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, false),
('evidence', '[{"key":"title","label":"이름·제목","type":"text","required":true},{"key":"evidenceType","label":"증빙 유형","type":"text","required":true},{"key":"storagePath","label":"비공개 파일 경로","type":"text","required":true},{"key":"originalName","label":"원본 파일명","type":"text","required":true},{"key":"sha256","label":"SHA-256","type":"text","required":true},{"key":"size","label":"파일 크기","type":"number","required":true,"min":0,"max":10485760},{"key":"contentType","label":"파일 유형","type":"text","required":true},{"key":"source","label":"수치·내용의 출처","type":"text","required":true},{"key":"checkedAt","label":"확인일","type":"date","required":false},{"key":"verificationStatus","label":"검증 상태","type":"select","options":["계획","진행 중","실증 완료","확인 필요","확정"],"required":true},{"key":"evidenceIds","label":"연결 증빙","type":"refs","ref":"evidence"}]'::jsonb, true);
