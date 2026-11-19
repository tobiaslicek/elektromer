import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("dist/index.html", "utf8");
const head = html.slice(html.indexOf("<head>") + 6, html.indexOf("</head>"));
const body = html.slice(html.indexOf("<body>") + 6, html.indexOf("</body>"));
const keep = head
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !/charset|name="viewport"/.test(l));
writeFileSync("dist/artifact.html", [...keep, body.trim()].join("\n") + "\n");
