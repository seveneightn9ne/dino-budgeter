# Dino Budgeter

Budgeting webapp.

## Development

See [Dev Setup] first.

Build the stuff

```
npm run build
```

Run the server

```
npm run serve
```

Watching

```
npm run watch-server
npm run watch-client
npm run watch-serve
```

## Dev Setup

### 1. Install Postgres

_Ubuntu_

```
sudo apt update
sudo apt install postgresql postgresql-contrib
```

_macOS_

```
brew install postgresql
```

Test that your database is running with `psql postgres`. If it doesn't work, run `brew services restart postgresql`.

### 2. Create a user named `budgeter` and give it no special priveleges.

_Ubuntu_

Ignore non-fatal errors about changing directories.

```
sudo -u postgres createuser --interactive
```

_macOS_

```
createuser --interactive
```

### 3. Set the user's password. Pick a good password and save it somewhere.

_Ubuntu_

```
sudo -u postgres psql
postgres=# \password budgeter
```

_macOS_

```
psql postgres
postgres=# \password budgeter
```

### 4. Create a database named `budgeter`.

_Ubuntu_

```
sudo -u postgres createdb budgeter
```

_macOS_

```
createdb budgeter
```

### 5. Set up your `.envrc` file for the project.

Install [`direnv`](https://direnv.net/) if you haven't.

Create a `.envrc` file in the repo root with the following contents:

```
export PGPASSWORD=blahblahpassword
export DINO_SESSION_SECRET=somelongsecuresecretstring
```

Set the `PGPASSWORD` value to the password you set in step 3.

Set the `DINO_SESSION_SECRET` to a long random string.

Afterwards, you may need to run `direnv allow`.

### 6. Initialize the db

```
sql/init.sh
```

### 7. Install nodejs and npm

https://nodejs.org/en/

### 8. Install typescript

```
npm install -g typescript
```

### 9. Install dependencies

```
brew install entr
npm install
```

# Production Deployment

Production environment is the same as dev, but you need a SMTP server on localhost:25 to send emails.
