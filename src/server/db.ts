import { IMain } from "pg-promise";
import pgPromise from "pg-promise";

const pgp: IMain = pgPromise();

export default pgp(`postgres://budgeter:${process.env.PGPASSWORD}@127.0.0.1/budgeter`);
