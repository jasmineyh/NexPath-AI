/**
 * Generates synthetic CV fixtures (no real personal data).
 *   tests/fixtures/synthetic_two_column.pdf   two-column "Canva style" PDF, out-of-order text stream
 *   tests/fixtures/single_column.pdf        conventional single-column CV
 *   tests/fixtures/conventional.docx        conventional CV as DOCX
 * Run: pnpm --filter @workspace/api-server exec tsx tests/make-fixtures.ts
 */
import { createWriteStream, mkdirSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { writeFile } from "node:fs/promises";

const OUT = path.resolve(import.meta.dirname, "../../../tests/fixtures");
mkdirSync(OUT, { recursive: true });

type Op = { text: string; x: number; y: number; size: number; bold: boolean; spacing?: number; order: number };

function wrap(doc: PDFKit.PDFDocument, text: string, width: number, size: number, bold: boolean): string[] {
  doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size);
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (doc.widthOfString(t) > width && cur) {
      lines.push(cur);
      cur = w;
    } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

async function canva() {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  doc.pipe(createWriteStream(path.join(OUT, "synthetic_two_column.pdf")));
  const ops: Op[] = [];
  const dateOps: Op[] = [];
  let order = 0;
  const put = (text: string, x: number, y: number, size: number, bold: boolean, spacing = 0, late = false) => {
    (late ? dateOps : ops).push({ text, x, y, size, bold, spacing, order: order++ });
  };
  const LX = 36;
  const LW = 232;
  const RX = 310;
  const RW = 250;

  // header row: name left, contact right on the same row
  put("FARAH", LX, 40, 30, true);
  put("012-3456789", RX, 46, 10, false);
  put("noidea@gmail.com", RX, 61, 10, false);

  // summary (unlabelled paragraph)
  let y = 88;
  const summary =
    "Computer Science student specialising in Data Engineering, aspiring to become a data specialist who wants to design useful systems and improve efficiency and security.";
  for (const l of wrap(doc, summary, LW, 9.5, false)) {
    put(l, LX, y, 9.5, false);
    y += 13;
  }

  // EDUCATION (left)
  y += 14;
  put("E D U C A T I O N", LX, y, 12, true);
  y += 24;
  const edu: [string, string, string | null, string][] = [
    ["Universiti Teknologi Malaysia", "Bachelor of Computer Science (Data Engineering)", null, "2025 - now"],
    ["Kolej Matrikulasi Pulau Pinang", "Physical Science", "CGPA: 4.00", "2024 - 2025"],
    ["SMK Mahmud", "STEM B", "3A+ 6A 2A-", "2022 - 2024"],
  ];
  for (const [inst, qual, res, date] of edu) {
    put(inst, LX, y, 10, true);
    dateOps.push({ text: date, x: LX + LW - 56, y, size: 9, bold: false, order: order++ });
    y += 14;
    for (const l of wrap(doc, qual, LW, 9.5, false)) {
      put(l, LX, y, 9.5, false);
      y += 12.5;
    }
    if (res) {
      put(res, LX, y, 9.5, false);
      y += 12.5;
    }
    y += 10;
  }

  // TECHNICAL SKILLS (left)
  y += 6;
  put("TECHNICAL SKILLS", LX, y, 12, true, 1.5);
  y += 22;
  const tech = [
    "Programming Languages: C++, Java, R, Python (basic), HTML, CSS, R",
    "Tools & Technologies: Git, GitHub, Flutter, VS Code, Firebase",
    "Data Analysis & AI: Data Visualization, Google Gemini API",
    "Design & Productivity Tools: Canva, Figma, CapCut",
  ];
  for (const t of tech) {
    for (const l of wrap(doc, t, LW, 9.5, false)) {
      put(l, LX, y, 9.5, false);
      y += 12.5;
    }
    y += 4;
  }
  // SOFT SKILLS (left) with Languages inside the column
  y += 8;
  put("SOFT SKILLS", LX, y, 12, true, 1.5);
  y += 22;
  for (const t of ["Communication, problem-solving, critical thinking", "Languages: English (Fluent), Malay (Fluent), Chinese (Native)"]) {
    for (const l of wrap(doc, t, LW, 9.5, false)) {
      put(l, LX, y, 9.5, false);
      y += 12.5;
    }
    y += 4;
  }

  // RIGHT column
  let ry = 104;
  put("A C A D E M I C  &  P R O J E C T  E X P E R I E N C E", RX, ry, 11, true);
  ry += 24;
  const projects: [string, string][] = [
    ["UTM x HACKATHON 2026 - Top 10 Finalist", "Built a data dashboard prototype with a team of four and presented it to industry judges."],
    ["PutraHack 2026", "Worked in a team to design a mobile app prototype for campus food sharing in 24 hours."],
    ["Varsity Hackathon 2026", "Created a working demo that tracks study progress and visualises weekly goals."],
    ["KitaHack 2026", "Developed an app using Flutter, Firebase and the Google Gemini API to give students quick study help."],
    ["NexG Godamlah! 2.0: Smart ID Hackathon 2025", "Designed a secure digital ID concept and pitched the flow to mentors."],
    ["Bridge Design Challenge Competition - Bronze Award", "Designed and tested a model bridge with my team, then explained the load results. Calculated the dept trap spacing before building."],
    ["MATRIX eXTRA CHALLENGE (MeX-Q) - Silver Award", "Solved quantitative problems under time pressure in a matriculation competition."],
  ];
  for (const [t, d] of projects) {
    for (const l of wrap(doc, t, RW, 10.5, true)) {
      put(l, RX, ry, 10.5, true);
      ry += 13.5;
    }
    for (const l of wrap(doc, d, RW, 9, false)) {
      put(l, RX, ry, 9, false);
      ry += 11.5;
    }
    ry += 9;
  }
  ry += 10;
  put("C O - C U R R I C U L A R  &  V O L U N T E E R  E X P E R I E N C E", RX, ry, 11, true);
  ry += 24;
  const vol: [string, string][] = [
    ["Cyber Skills Level-Up! 2026 - Technical Unit Crew", "Set up the equipment and helped participants join the online sessions."],
    ["Chinese Poetry Recitation Competition 2023 - Head of Organising Committee", "Led a committee of ten to plan the schedule, judges and venue."],
  ];
  for (const [t, d] of vol) {
    for (const l of wrap(doc, t, RW, 10.5, true)) {
      put(l, RX, ry, 10.5, true);
      ry += 13.5;
    }
    for (const l of wrap(doc, d, RW, 9, false)) {
      put(l, RX, ry, 9, false);
      ry += 11.5;
    }
    ry += 9;
  }

  // Emit the text stream in an order that is NOT the visual order: right column
  // first, then the left column, and the dates last (after the skills section).
  const all = [...ops, ...dateOps];
  const rank = (o: Op) => (dateOps.includes(o) ? 3 : o.x >= RX - 2 && o.y > 90 ? 0 : o.x >= RX - 2 ? 1 : 2);
  all.sort((a, b) => rank(a) - rank(b) || a.order - b.order);
  for (const o of all) {
    doc.font(o.bold ? "Helvetica-Bold" : "Helvetica").fontSize(o.size).fillColor("#111");
    doc.text(o.text, o.x, o.y, { lineBreak: false, characterSpacing: o.spacing ?? 0 });
  }
  doc.end();
}

async function singleColumn() {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  doc.pipe(createWriteStream(path.join(OUT, "single_column.pdf")));
  let y = 40;
  const line = (t: string, size = 10, bold = false, x = 50, right?: string) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(size).fillColor("#000").text(t, x, y, { lineBreak: false });
    if (right) doc.font("Helvetica").fontSize(10).text(right, 560 - doc.widthOfString(right), y, { lineBreak: false });
    y += size + 5;
  };
  line("AMIRUL HAKIM BIN ROSLI", 22, true);
  line("12, Jalan Ampang Hilir, 55000 Kuala Lumpur, Malaysia");
  line("amirul.hakim@example.com | 016-234 5678 | linkedin.com/in/amirul-hakim");
  y += 8;
  line("PROFESSIONAL SUMMARY", 12, true);
  line("Software developer with two years of experience building internal tools and web services.");
  y += 6;
  line("WORK EXPERIENCE", 12, true);
  line("Software Developer", 11, true, 50, "Mar 2023 - Present");
  line("Axiata Digital Sdn Bhd, Kuala Lumpur");
  line("- Built internal REST APIs used by the finance team", 10, false, 60);
  line("- Reduced report generation time by writing optimised SQL queries", 10, false, 60);
  y += 4;
  line("Software Engineering Intern", 11, true, 50, "Jun 2022 - Dec 2022");
  line("Grab Malaysia Sdn Bhd");
  line("- Fixed bugs in the driver app and wrote unit tests", 10, false, 60);
  y += 6;
  line("EDUCATION", 12, true);
  line("Universiti Malaya", 11, true, 50, "2019 - 2023");
  line("Bachelor of Science in Computer Science", 10);
  line("CGPA: 3.62", 10);
  y += 6;
  line("SKILLS", 12, true);
  line("Technical: Python, Java, SQL, REST APIs, Git, Docker");
  line("Soft skills: Teamwork, Communication, Time management");
  y += 6;
  line("CERTIFICATIONS", 12, true);
  line("AWS Certified Cloud Practitioner, 2024");
  doc.end();
}

async function docx() {
  const p = (t: string, heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel], bold = false) =>
    new Paragraph({ heading, children: [new TextRun({ text: t, bold })] });
  const d = new Document({
    sections: [
      {
        children: [
          p("Nurul Aisyah binti Hamzah", HeadingLevel.TITLE),
          p("Georgetown, Penang | aisyah.hamzah@example.com | 011-2345 6789"),
          p("Summary", HeadingLevel.HEADING_1),
          p("Marketing graduate who enjoys creating social media campaigns and analysing engagement data."),
          p("Experience", HeadingLevel.HEADING_1),
          p("Marketing Executive | Penang Foods Sdn Bhd | Jan 2024 - Present", undefined, true),
          p("- Planned and ran weekly social media campaigns"),
          p("- Prepared monthly engagement reports in Excel"),
          p("Education", HeadingLevel.HEADING_1),
          p("Universiti Sains Malaysia", undefined, true),
          p("Bachelor of Management (Marketing), 2019 - 2023"),
          p("Skills", HeadingLevel.HEADING_1),
          p("Social media marketing, Excel, Canva, Communication, Teamwork"),
        ],
      },
    ],
  });
  await writeFile(path.join(OUT, "conventional.docx"), await Packer.toBuffer(d));
}

await canva();
await singleColumn();
await docx();
console.log("fixtures written to", OUT);
