begin;

create table playground (
  foo varchar (50) primary key
);

CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

create table users (
  uid char(32) primary key,
  email varchar(255) unique not null,
  password_hash char(60) not null,
  ctime timestamp not null default current_timestamp,
  name varchar(255),
);
create index email on users(email);

create table groups (
  gid char(32) not null primary key,
  ctime timestamp not null default current_timestamp
);

create table membership (
  uid char(32) not null references users,
  gid char(32) not null references groups,
  primary key (uid, gid)
);

create table friendship (
  u1 char(32) not null references users,
  u2 char(32) not null references users,
  u1_accepted bool not null,
  u2_accepted bool not null,
  balance text not null, -- u1 owes u2
  alive bool not null,
  primary key (u1, u2)
);
create index friendship_u2 on friendship(u2);

create table frames (
  gid char(32) not null references groups,
  index int not null,
  income text not null,
  primary key (gid, index)
);

create table categories (
  id char(32) not null, -- there are many entries with the same id
  gid char(32) not null references groups,
  frame int not null,
  alive bool not null default true,
  name text not null,
  ordering int not null,
  ctime timestamp not null default current_timestamp,
  budget text not null,
  primary key (id, frame),
  foreign key (gid, frame) references frames
);

create table transactions (
  id char(32) primary key,
  gid char(32) not null references groups,
  frame int not null, -- transaction always has a frame, but may not have a category yet
  category char(32),
  amount text not null,
  description text not null,
  alive bool not null default true,
  ctime timestamp not null default current_timestamp,
  date timestamp not null,
  foreign key (category, frame) references categories
);

create table shared_transactions (
  id char(32) primary key,
  payer char(32) references users,
  settled bool not null default false
);

create table transaction_splits (
  tid char(32) primary key references transactions,
  sid char(32) references shared_transactions,
  share text not null
);
create index split_sid on transaction_splits(sid);

create table payments (
  friendship_u1 char(32) not null references users,
  friendship_u2 char(32) not null references users,
  amount text not null default '0',
  is_charge bool not null, -- either charge or payment.
  ctime timestamp not null default current_timestamp
);
create index payments_idx on payments(friendship_u1, friendship_u2, ctime);

commit;
