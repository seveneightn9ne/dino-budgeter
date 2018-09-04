# Dino Budgeter
Budgeting webapp.

## Development

See [Database setup] first.

Build the stuff
```
npm run build
```

Watching compiler for the server
```
npm run watch-server
```

Restarting server
```
npm run watch-serve
```

## Database setup
(ubuntu)

1. Install Postgres
```
sudo apt update
sudo apt install postgresql postgresql-contrib
```

2. Create a user named `budgeter` and give it no special priveleges.

Ignore non-fatal errors about changing directories.
```
sudo -u postgres createuser --interactive
```

3. Set the user's password. Pick a good password and save it somewhere.
```
sudo -u postgres psql
postgres=# \password budgeter
```

4. Create a database named `budgeter`.
```
sudo -u postgres createdb budgeter
```

5. Add this to your `.envrc` file for the project.

Create a `.envrc` file if you don't have one. Make sure it's gitignored!

Install [`direnv`](https://direnv.net/) if you haven't.

You may need to run `direnv allow`.

```
export PGPASSWORD=blahblahpassword
```

6. Initialize the db
```
sql/init.sh
```

That's it, the app should now be able to connect to the db.
