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

*Ubuntu*

```
sudo apt update
sudo apt install postgresql postgresql-contrib
```

*macOS*

```
brew install postgresql
```
Test that your database is running with `psql postgres`. If it doesn't work, run `brew services restart postgresql`.

### 2. Create a user named `budgeter` and give it no special priveleges.

*Ubuntu*

Ignore non-fatal errors about changing directories.
```
sudo -u postgres createuser --interactive
```

*macOS*

```
createuser --interactive
```

### 3. Set the user's password. Pick a good password and save it somewhere.

*Ubuntu*

```
sudo -u postgres psql
postgres=# \password budgeter
```

*macOS*

```
psql postgres
postgres=# \password budgeter
```

### 4. Create a database named `budgeter`.

*Ubuntu*

```
sudo -u postgres createdb budgeter
```

*macOS*

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
npm install
```
