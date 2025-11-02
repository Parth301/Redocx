import express from "express";
import multer from "multer";
import helmet from "helmet";
import morgan from "morgan";
import mammoth from "mammoth";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
} from "docx";

// === Initialize Express ===
const app = express();
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

// === Multer for File Uploads ===
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

// === Gemini Setup ===
// ⚠️ Keep your API key here safely or use process.env.GEMINI_API_KEY
const genAI = new GoogleGenerativeAI("AIzaSyBq7sDIOg7hyww-mmKdNRk8u8CC5cYP--w");
const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-pro" });

// === Safe JSON Parser ===
function safeParse(jsonStr) {
    try {
        const cleaned = jsonStr
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .replace(/[\u0000-\u001F]+/g, "")
            .trim();
        return JSON.parse(cleaned);
    } catch (err) {
        console.error("⚠️ Failed to parse JSON:", err.message);
        return {
            title: "Formatting Error",
            sections: [
                {
                    heading: "AI Response Parsing Failed",
                    content: "Returning unformatted version of the text.",
                    subpoints: [],
                },
            ],
        };
    }
}

// === 1️⃣ Extract text from uploaded DOCX or TXT ===
async function extractDocxText(buffer) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
}

// === 2️⃣ Ask Gemini for full formatting plan ===
async function getFormattingPlan(text) {
    const prompt = `
You are a **Word Document Formatting AI Agent**.
Your task is to generate a **pure JSON formatting plan** that will be used to fully format the document.

### The JSON MUST strictly follow this schema:
{
  "title": "string",
  "styles": {
    "title": {"font": "string", "size": number, "bold": boolean, "alignment": "center"|"left"|"right"},
    "heading": {"font": "string", "size": number, "bold": boolean, "color": "hex"},
    "paragraph": {"font": "string", "size": number, "color": "hex"}
  },
  "sections": [
    {
      "heading": "string",
      "content": "string",
      "subpoints": ["string"],
      "alignment": "left"|"center"|"right"|"justify",
      "color": "hex",
      "spacing": number,
      "pageBreakAfter": boolean
    }
  ],
  "tables": [
    {
      "title": "string",
      "headers": ["string"],
      "rows": [["string"]],
      "style": {"borderColor": "hex", "headerColor": "hex"}
    }
  ],
  "footer": "string"
}

### Important:
- Only return JSON — no markdown, code fences, or commentary.
- Use consistent structure even if some sections are empty.
- Choose colors and alignments professionally.
- Convert raw text paragraphs into proper sections with headings and subpoints where appropriate.

Here is the document content:
"""${text}"""
`;

    const result = await model.generateContent(prompt);
    const response = await result.response.text();
    return safeParse(response);
}

// === 3️⃣ Build DOCX Dynamically from JSON ===
async function buildDocx(plan) {
    const doc = new Document({
        sections: [
            {
                children: [
                    // === Title ===
                    new Paragraph({
                        text: plan.title || "Formatted Document",
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 300 },
                    }),

                    // === Sections ===
                    ...(plan.sections || []).flatMap((sec) => {
                        const paragraphs = [];

                        if (sec.heading) {
                            paragraphs.push(
                                new Paragraph({
                                    text: sec.heading,
                                    heading: HeadingLevel.HEADING_1,
                                    spacing: { before: 200, after: 100 },
                                    color: sec.color || "000000",
                                })
                            );
                        }

                        if (sec.content) {
                            paragraphs.push(
                                new Paragraph({
                                    text: sec.content,
                                    spacing: { after: sec.spacing || 200 },
                                    alignment: AlignmentType[sec.alignment?.toUpperCase()] || AlignmentType.LEFT,
                                })
                            );
                        }

                        if (Array.isArray(sec.subpoints)) {
                            for (const point of sec.subpoints) {
                                paragraphs.push(
                                    new Paragraph({
                                        children: [new TextRun({ text: "• " + point })],
                                        spacing: { after: 100 },
                                    })
                                );
                            }
                        }

                        if (sec.pageBreakAfter) {
                            paragraphs.push(new Paragraph({ pageBreakBefore: true }));
                        }

                        return paragraphs;
                    }),

                    // === Tables ===
                    ...(plan.tables || []).flatMap((tbl) => [
                        new Paragraph({
                            text: tbl.title || "",
                            heading: HeadingLevel.HEADING_2,
                            spacing: { before: 200, after: 200 },
                        }),
                        new Table({
                            rows: [
                                new TableRow({
                                    children: (tbl.headers || []).map(
                                        (h) =>
                                            new TableCell({
                                                children: [new Paragraph({ text: h, bold: true })],
                                            })
                                    ),
                                }),
                                ...(tbl.rows || []).map(
                                    (r) =>
                                        new TableRow({
                                            children: r.map(
                                                (cell) =>
                                                    new TableCell({
                                                        children: [new Paragraph({ text: cell || "" })],
                                                    })
                                            ),
                                        })
                                ),
                            ],
                        }),
                    ]),

                    // === Footer ===
                    new Paragraph({
                        text: plan.footer || "",
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 300 },
                    }),
                ],
            },
        ],
    });

    return await Packer.toBuffer(doc);
}

// === 4️⃣ API Endpoint ===
app.post("/api/format", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const text = await extractDocxText(req.file.buffer);
        const plan = await getFormattingPlan(text);
        const buffer = await buildDocx(plan);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader("Content-Disposition", 'attachment; filename="formatted.docx"');
        res.send(buffer);
    } catch (err) {
        console.error("❌ Formatting failed:", err);
        res.status(500).json({ error: "Formatting failed", details: err.message });
    }
});

// === 5️⃣ Local Server (for dev) ===
if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✅ Formatter running on port ${PORT}`));
}

export default app;
