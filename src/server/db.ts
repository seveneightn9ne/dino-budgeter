import { IMain } from "pg-promise";
import pgPromise from "pg-promise";

const pgp: IMain = pgPromise({
  error: (err: any, e: pgPromise.IEventContext) => {
    let msg = "";
    if (typeof err === "string") {
      msg = err;
    } else if (err instanceof Error) {
      msg = err.message;
    }

    if (e.query) {
      if (e.params) {
        msg =
          "Exception in DB query: " +
          e.query +
          " with params: " +
          JSON.stringify(e.params) +
          "\n" +
          msg;
      } else {
        msg = "Exception in DB query: " + e.query + "\n" + msg;
      }
    }

    console.error(msg);
    // console.error(err);
  },
});

export default pgp(
  `postgres://budgeter:${process.env.PGPASSWORD}@127.0.0.1/budgeter`,
);
