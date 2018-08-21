import express from "express";
import { Request, Response } from "express";

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3000);

/**
 * Primary app routes.
 */
app.get("/", express.static('client/index.js'));

export default app;
