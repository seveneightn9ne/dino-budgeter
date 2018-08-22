#!/usr/bin/env bash
set -eu

echo "Drop the whole database?"
read -p "[y/N]: " CHOICE
case "$CHOICE" in
	y|Y ) psql --host=127.0.0.1 --user=budgeter --dbname=budgeter --no-password < sql/drop.sql ;;
	n|N ) echo "canceled" ;;
	* ) echo "canceled" ;;
esac
