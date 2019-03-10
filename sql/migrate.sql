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

-- migration 5: add balance & alive to friendship
do $$ begin
if not exists(select * from information_schema.columns where table_name = 'friendship' and column_name = 'balance')
then
alter table friendship add balance text not null default '0';
alter table friendship add alive bool not null default true;
end if;
end $$;

-- migration 6: names
do $$ begin
if not exists(select * from information_schema.columns where table_name = 'users' and column_name = 'name')
then
alter table users add name varchar(255) default null;
end if;
end $$;

-- migration 7: payments table
do $$ begin
if not exists(select * from information_schema.tables where table_name = 'payments')
then
create table payments (
  friendship_u1 char(32) not null references users,
  friendship_u2 char(32) not null references users,
  amount text not null default '0',
  is_charge bool not null, -- either charge or payment.
  ctime timestamp not null default current_timestamp
);
create index payments_idx on payments(friendship_u1, friendship_u2, ctime);
end if;
end $$;

-- migration 8: payments memo field
do $$ begin
if not exists(select * from information_schema.columns where table_name = 'payments' and column_name = 'memo')
then
alter table payments add memo text not null default '';
end if;
end $$;

-- migration 9: payments frame field
do $$ begin
if not exists(select * from information_schema.columns where table_name = 'payments' and column_name = 'frame')
then
alter table payments add frame int not null;
end if;
end $$;

-- migration 10: ghost frames
do $$ begin
if not exists(select * from information_schema.columns where table_name = 'frames' and column_name = 'ghost')
then
alter table frames add ghost bool not null default false;
alter table categories add ghost bool not null default false;
end if;
end $$;

-- migration 11: users settings
do $$ begin
if not exists(select * from information_schema.columns where table_name = 'users' and column_name = 'settings')
then
alter table users add settings json not null default '{}';
end if;
end $$;


-- migration 12: password resets
do $$ begin
if not exists(select * from information_schema.tables where table_name = 'email_resets')
then
create table email_resets (
  uid char(32) not null primary key references users,
  token text not null,
  expires timestamp not null
);
create index token_idx on email_resets(token);
end if;
end $$;

-- migration 13a: payment id
do $$ begin
if not exists(select * from information_schema.columns where table_name = 'payments' and column_name = 'id')
then
alter table payments add id char(32);
end if;
end $$;

-- migration 13b: make payment id be primary key
do $$ begin
if (not exists(
    select kcu.column_name
    from information_schema.key_column_usage kcu 
    join information_schema.table_constraints tc on tc.constraint_name = kcu.constraint_name 
    where tc.constraint_type = 'PRIMARY KEY' and kcu.table_name = 'payments' and kcu.column_name = 'id'))
  and (not exists(
    select * from payments where id is null))
then
alter table payments add primary key (id);
end if;
end $$;

commit;