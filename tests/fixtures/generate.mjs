// Regenerates the fictional resume fixtures used by tests/documentText.test.ts:
//   node tests/fixtures/generate.mjs
// The PDF is written by hand (single page, Helvetica, WinAnsi encoding) and the
// .docx is a minimal Office Open XML package built with JSZip, which is already
// installed as a dependency of mammoth.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const here = dirname(fileURLToPath(import.meta.url));
const demo = readFileSync(join(here, "../../lib/demoData.ts"), "utf8");
const resume = demo.split("export const DEMO_RESUME = `")[1].split("`;")[0];
const lines = resume.split("\n");

// ---------- PDF ----------
const WIN_ANSI = { "—": 0o227, "–": 0o226, "·": 0o267 };
function pdfString(text) {
  let out = "";
  for (const ch of text) {
    if (ch === "(" || ch === ")" || ch === "\\") out += "\\" + ch;
    else if (WIN_ANSI[ch]) out += "\\" + WIN_ANSI[ch].toString(8);
    else out += ch;
  }
  return `(${out})`;
}

// Wrap long lines like a real resume would, so quotes that span a line break are exercised.
function wrap(line, width = 95) {
  const out = [];
  let current = "";
  for (const word of line.split(" ")) {
    if (current && (current + " " + word).length > width) {
      out.push(current);
      current = word;
    } else current = current ? current + " " + word : word;
  }
  return [...out, current];
}
const pdfLines = lines.flatMap((l) => wrap(l));
const content = ["BT", "/F1 10 Tf", "13 TL", "50 800 Td", ...pdfLines.map((l) => `${pdfString(l)} Tj T*`), "ET"].join("\n");
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
];
let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(Buffer.byteLength(pdf, "latin1"));
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});
const xrefAt = Buffer.byteLength(pdf, "latin1");
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
pdf += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
writeFileSync(join(here, "demo-resume.pdf"), Buffer.from(pdf, "latin1"));

// ---------- DOCX ----------
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paragraphs = lines.map((l) => `<w:p><w:r><w:t xml:space="preserve">${esc(l)}</w:t></w:r></w:p>`).join("");
const zip = new JSZip();
zip.file(
  "[Content_Types].xml",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
);
zip.file(
  "_rels/.rels",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
);
zip.file(
  "word/document.xml",
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`,
);
writeFileSync(join(here, "demo-resume.docx"), await zip.generateAsync({ type: "nodebuffer" }));

console.log("Wrote demo-resume.pdf and demo-resume.docx");
