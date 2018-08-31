begin;

create table if not exists playground (
  foo varchar (50) primary key
);

CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
	"sess" json NOT NULL,
	"expire" timestamp(6) NOT NULL
)
WITH (OIDS=FALSE);
ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

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
  index int not null,
  balance text not null,
  income text not null,
  primary key (gid, index)
);

create table if not exists categories (
  id char(32) not null, -- there are many entries with the same id
  gid char(32) not null references groups,
  frame int not null,
  alive bool not null default true,
  name text not null,
  ordering int not null,
  ctime timestamp not null default current_timestamp,
  budget text not null,
  balance text not null,
  primary key (id, frame),
  foreign key (gid, frame) references frames
);

create table if not exists transactions (
  id char(32) primary key,
  gid char(32) not null references groups,
  frame int not null, -- transaction always has a frame, but may not have a category yet
  category char(32),
  amount text not null,
  description text not null,
  alive bool not null default true,
  ctime timestamp not null default current_timestamp,
  foreign key (frame, category) references categories
);

commit;
