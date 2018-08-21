"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// Create Express server
const app = express_1.default();
// Express configuration
app.set("port", process.env.PORT || 3000);
/**
 * Primary app routes.
 */
app.get("/", express_1.default.static('client/index.js'));
exports.default = app;
//# sourceMappingURL=app.js.map