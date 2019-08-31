import nodemailer from "nodemailer";
import app from "./app";

let _transporter: nodemailer.Transporter;

function transporter(): nodemailer.Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: "localhost",
      port: 25,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return _transporter;
}

export function send(opts: { to: string; subject: string; body: string }) {
  if (app.get("env") === "production") {
    transporter().sendMail({
      from: '"Dino Budgeting" dino@dino.jesskenney.com',
      to: opts.to,
      subject: opts.subject,
      text: opts.body,
    });
  } else {
    console.warn("Would have sent the following email:");
    console.warn(`To: ${opts.to}`);
    console.warn(`Subject: ${opts.subject}`);
    console.warn(opts.body);
  }
}
