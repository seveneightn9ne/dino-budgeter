begin;

create table if not exists playground (
  foo varchar (50) primary key
);

create table if not exists users (
  uid char(32) primary key,
  email varchar(255) unique not null,
  password_hash char(60) not null,
  ctime timestamp not null default current_timestamp
);

create table if not exists groups (
  gid char(32) not null primary key,
  ctime timestamp not null default current_timestamp
);

create table if not exists membership (
  uid char(32) not null references users,
  gid char(32) not null references groups,
  primary key (uid, gid)
);

create table if not exists frames (
  gid char(32) not null references groups,
  frame int not null,
  primary key (gid, frame)
);

create table if not exists income (
  gid char(32) not null references groups,
  frame int not null,
  income text not null,
  primary key (gid, frame)
);

create table if not exists categories (
  gid char(32) not null references groups,
  id char(32) not null,
  frame int not null,
  alive bool not null,
  name text not null,
  ctime timestamp not null default current_timestamp,
  primary key (gid, id, frame),
  unique (id, frame)
);

create table if not exists transactions (
  id char(32) primary key,
  gid char(32) not null references groups,
  frame int not null,
  alive bool not null,
  ctime timestamp not null default current_timestamp
);

commit;
