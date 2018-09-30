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

-- migration 3: add shared transactions & user friendships.
do $$ begin
if not exists(select * from information_schema.tables where table_name = 'shared_transactions')
then
create index email on users(email);
create table friendship (
  u1 char(32) not null references users,
  u2 char(32) not null references users,
  u1_accepted bool not null,
  u2_accepted bool not null,
  primary key (u1, u2)
);
create index friendship_u2 on friendship(u2);
create table shared_transactions (
  id char(32) primary key,
  payer char(32) references users,
  settled bool not null default false
);
create table transaction_splits (
  tid char(32) primary key references transactions,
  sid char(32) references shared_transactions
);
create index split_sid on transaction_splits(sid);
end if;
end $$;

-- migration 4: add transaction_splits.share column
do $$ begin
if not exists(select * from information_schema.columns where table_name = 'transaction_splits' and column_name = 'share')
then
alter table transaction_splits add share text not null default '';
end if;
end $$;

-- migration 5:

commit;