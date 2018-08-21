create table playground (
  foo varchar (50) primary key
);
create table users (
  user_id char(32) primary key,
  email varchar(255) unique not null,
  password_hash char(60) not null,
)