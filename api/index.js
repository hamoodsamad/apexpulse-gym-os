import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const handler = require("./_bundle.cjs");

export default handler;
