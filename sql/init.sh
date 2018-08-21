#!/usr/bin/env bash

psql --host=127.0.0.1 --user=budgeter --dbname=budgeter < sql/init.sql
