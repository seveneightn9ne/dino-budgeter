import app from "./app";
import { runMigrations } from "./db_migrations";
import * as email from "./email";

let server = null;

if (!process.env.DINO_SESSION_SECRET) {
  console.error("FATAL: DINO_SESSION_SECRET is required");
} else {
  runMigrations().then(
    () =>
      (server = app.listen(app.get("port"), () => {
        console.log(
          "App is running at http://localhost:%d in %s mode",
          app.get("port"),
          app.get("env"),
        );
        console.log("Press CTRL-C to stop\n");
        email.send({
          to: "jess@jesskenney.com",
          subject: "Dino Server Started",
          body: "",
        });
      })),
  );
}

export default server;
