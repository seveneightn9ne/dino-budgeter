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
  id char(32) not null primary key,
  gid char(32) not null references groups,
  month int not null,
  year int not null,
  income text not null,
  unique (gid, year, month)
);

create table if not exists categories (
  id char(32) not null,
  fid char(32) not null references frames,
  alive bool not null,
  name text not null,
  ctime timestamp not null default current_timestamp,
  primary key (fid, id)
);

create table if not exists transactions (
  id char(32) primary key,
  fid char(32) not null references frames, -- transaction always has a frame, but may not have a category yet
  category char(32),
  alive bool not null,
  ctime timestamp not null default current_timestamp,
  foreign key (category, fid) references categories
);

commit;
