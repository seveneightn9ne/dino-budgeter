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
  ctime timestamp not null default current_timestamp
);

create table groups (
  gid char(32) not null primary key,
  ctime timestamp not null default current_timestamp
);

create table membership (
  uid char(32) not null references users,
  gid char(32) not null references groups,
  primary key (uid, gid)
);

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

commit;
