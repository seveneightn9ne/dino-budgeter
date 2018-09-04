begin;

-- migration 1: add date to transactions.
do $$ begin
if not exists(select * from information_schema.columns where table_name = 'transactions' and column_name = 'date')
then
 alter table transactions add date timestamp not null default current_timestamp;
 update transactions set date = ctime;
end if;
end $$;

-- migration 2: remove balance columns.
do $$ begin
if exists(select * from information_schema.columns where table_name = 'frames' and column_name = 'balance')
then
 alter table frames drop balance;
 alter table categories drop balance;
end if;
end $$;

commit;
