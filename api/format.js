import express from "express";
import multer from "multer";
import helmet from "helmet";
import morgan from "morgan";
import mammoth from "mammoth";
import JSZip from "jszip";
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
    ImageRun,
    WidthType,
    BorderStyle,
    VerticalAlign,
} from "docx";

const app = express();
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

// === Separate API Keys for Different Tasks ===
const GEMINI_FORMATTING_KEY = process.env.GEMINI_API_KEY || "AIzaSyBq7sDIOg7hyww-mmKdNRk8u8CC5cYP--w";
const GEMINI_VISION_KEY = process.env.GEMINI_VISION_API_KEY || "AIzaSyDdk-Fw0ciH0j2ohBJxJ6XUOswQanX4ltc";

// Check API key configuration
if (!GEMINI_FORMATTING_KEY || GEMINI_FORMATTING_KEY === 'YOUR_API_KEY_HERE') {
    console.warn("⚠️ WARNING: No valid GEMINI_API_KEY found. Set GEMINI_API_KEY environment variable.");
}

if (!GEMINI_VISION_KEY || GEMINI_VISION_KEY === 'YOUR_API_KEY_HERE') {
    console.warn("⚠️ WARNING: No Vision API key. Image analysis will use default captions.");
    console.warn("   Set GEMINI_VISION_API_KEY to enable AI image analysis.");
}

// Formatting AI (for document structure)
const genAI = new GoogleGenerativeAI(GEMINI_FORMATTING_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// Vision AI (for image analysis) - uses separate key
const visionAI = new GoogleGenerativeAI(GEMINI_VISION_KEY);
const visionModel = visionAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

// === Retry Logic for Rate Limits ===
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.status === 429 || error.message?.includes('429');
            const isLastAttempt = i === maxRetries - 1;

            if (!isRateLimit || isLastAttempt) {
                throw error;
            }

            const delay = initialDelay * Math.pow(2, i);
            console.log(`⏳ Rate limited. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

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
            sections: [{ heading: "Error", content: "Failed to parse AI response" }],
        };
    }
}

// === Sanitize text for DOCX (prevent XML errors) ===
function sanitizeText(text) {
    if (!text) return "";
    return String(text)
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, "") // Remove control characters
        .replace(/\uFFFD/g, "") // Remove replacement characters
        .substring(0, 10000); // Reasonable length limit
}

// === Get Image Dimensions with Better Error Handling ===
function getImageDimensions(imageBuffer, contentType) {
    try {
        if (!imageBuffer || imageBuffer.length < 24) {
            console.warn("⚠️ Image buffer too small");
            return { width: 600, height: 400 };
        }

        if (contentType.includes('png')) {
            // PNG: read dimensions from IHDR chunk
            if (imageBuffer.length > 24) {
                const width = imageBuffer.readUInt32BE(16);
                const height = imageBuffer.readUInt32BE(20);
                if (width > 0 && width < 10000 && height > 0 && height < 10000) {
                    return { width, height };
                }
            }
        } else if (contentType.includes('jpeg') || contentType.includes('jpg')) {
            // JPEG: scan for SOF marker
            let offset = 2;
            while (offset < imageBuffer.length - 10) {
                if (imageBuffer[offset] !== 0xFF) break;
                const marker = imageBuffer[offset + 1];
                const size = imageBuffer.readUInt16BE(offset + 2);

                if (marker === 0xC0 || marker === 0xC2) {
                    const height = imageBuffer.readUInt16BE(offset + 5);
                    const width = imageBuffer.readUInt16BE(offset + 7);
                    if (width > 0 && width < 10000 && height > 0 && height < 10000) {
                        return { width, height };
                    }
                }
                offset += size + 2;
                if (offset >= imageBuffer.length) break;
            }
        } else if (contentType.includes('gif')) {
            // GIF: dimensions at bytes 6-9
            if (imageBuffer.length > 10) {
                const width = imageBuffer.readUInt16LE(6);
                const height = imageBuffer.readUInt16LE(8);
                if (width > 0 && width < 10000 && height > 0 && height < 10000) {
                    return { width, height };
                }
            }
        }
    } catch (err) {
        console.error("⚠️ Could not read image dimensions:", err.message);
    }
    return { width: 600, height: 400 }; // safe fallback
}

// === Calculate Smart Image Size ===
function calculateImageSize(originalWidth, originalHeight, maxWidth = 650) {
    const aspectRatio = originalWidth / originalHeight;

    if (originalWidth <= maxWidth) {
        return { width: originalWidth, height: originalHeight };
    }

    const newWidth = maxWidth;
    const newHeight = Math.round(newWidth / aspectRatio);

    return { width: newWidth, height: newHeight };
}

// === Enhanced Image Analysis ===
async function analyzeImageWithAI(imageBuffer, contentType) {
    // Check if Vision API is configured
    if (!GEMINI_VISION_KEY || GEMINI_VISION_KEY.includes('YOUR_API_KEY')) {
        console.warn("⚠️ No Vision API key configured, using default captions");
        return {
            description: "Image from document",
            type: "image",
            purpose: "visual content",
            visibleText: "",
            keyElements: [],
            suggestedCaption: "Document image"
        };
    }

    try {
        const base64Image = imageBuffer.toString('base64');

        const prompt = `Analyze this image from a document and provide detailed information:

1. **Description**: What does this image show? (2-3 sentences)
2. **Type**: Classify as one of: photo, chart, graph, diagram, screenshot, logo, illustration, table, infographic, map, other
3. **Purpose**: Why is this image in the document? What information does it convey?
4. **Visible Text**: Any text, labels, or numbers visible in the image
5. **Key Elements**: Main components or data points shown
6. **Suggested Caption**: A professional caption for this image

Return as JSON:
{
  "description": "detailed description",
  "type": "specific type",
  "purpose": "document purpose",
  "visibleText": "text content",
  "keyElements": ["element1", "element2"],
  "suggestedCaption": "professional caption"
}`;

        const result = await retryWithBackoff(async () => {
            return await visionModel.generateContent([
                {
                    inlineData: {
                        data: base64Image,
                        mimeType: contentType || 'image/png'
                    }
                },
                { text: prompt }
            ]);
        }, 2, 2000); // Reduced retries for image analysis

        const response = await result.response.text();
        return safeParse(response);
    } catch (err) {
        // Provide more specific error info
        if (err.message?.includes('SERVICE_DISABLED')) {
            console.error("⚠️ Generative Language API is disabled. Enable it in Google Cloud Console.");
        } else if (err.message?.includes('API_KEY')) {
            console.error("⚠️ Invalid API key for Vision API");
        } else if (err.message?.includes('403')) {
            console.error("⚠️ API access forbidden - check API key and permissions");
        } else {
            console.error("⚠️ Image analysis failed:", err.message);
        }

        return {
            description: "Image from document",
            type: "image",
            purpose: "visual content",
            visibleText: "",
            keyElements: [],
            suggestedCaption: "Document image"
        };
    }
}

// === Extract Images Directly from DOCX ZIP ===
async function extractImagesFromZip(buffer) {
    const imageMap = new Map();

    try {
        const zip = await JSZip.loadAsync(buffer);
        const mediaFolder = zip.folder("word/media");

        if (!mediaFolder) {
            console.log("📁 No media folder found in document");
            return imageMap;
        }

        const imageFiles = [];
        mediaFolder.forEach((relativePath, file) => {
            if (!file.dir && /\.(png|jpg|jpeg|gif|bmp)$/i.test(relativePath)) {
                imageFiles.push({ relativePath, file });
            }
        });

        console.log(`📁 Found ${imageFiles.length} images in document`);

        for (let i = 0; i < imageFiles.length; i++) {
            const { relativePath, file } = imageFiles[i];
            const imageId = `{{IMAGE_${i}}}`;

            try {
                console.log(`🔍 Processing: ${relativePath}`);

                const imageBuffer = await file.async("nodebuffer");

                // Determine content type
                let contentType = "image/png";
                if (relativePath.match(/\.jpe?g$/i)) contentType = "image/jpeg";
                else if (relativePath.match(/\.gif$/i)) contentType = "image/gif";
                else if (relativePath.match(/\.bmp$/i)) contentType = "image/bmp";

                // Get dimensions
                const dimensions = getImageDimensions(imageBuffer, contentType);
                console.log(`   Size: ${dimensions.width}x${dimensions.height}`);

                // Analyze with AI
                console.log(`   Analyzing with Vision API...`);
                const analysis = await analyzeImageWithAI(imageBuffer, contentType);

                imageMap.set(imageId, {
                    buffer: imageBuffer,
                    contentType,
                    originalWidth: dimensions.width,
                    originalHeight: dimensions.height,
                    analysis,
                });

            } catch (err) {
                console.error(`⚠️ Failed to process ${relativePath}:`, err.message);
            }
        }

        console.log(`✅ Successfully extracted ${imageMap.size} images`);
        return imageMap;

    } catch (err) {
        console.error("❌ ZIP extraction failed:", err.message);
        return imageMap;
    }
}

// === Extract Images with AI Descriptions (Fallback Method) ===
async function extractImagesWithDescriptions(buffer) {
    // Try ZIP extraction first (more reliable)
    let imageMap = await extractImagesFromZip(buffer);

    // If no images found, try mammoth method
    if (imageMap.size === 0) {
        console.log("🔄 Trying alternative extraction method...");

        try {
            const { value: html } = await mammoth.convertToHtml({
                buffer,
                convertImage: mammoth.images.imgElement(async (image) => {
                    try {
                        const imageBuffer = await image.read();
                        const imageId = `{{IMAGE_${imageMap.size}}}`;

                        console.log(`🔍 Analyzing image ${imageMap.size} with Vision API...`);

                        const dimensions = getImageDimensions(imageBuffer, image.contentType);
                        const analysis = await analyzeImageWithAI(imageBuffer, image.contentType);

                        imageMap.set(imageId, {
                            buffer: imageBuffer,
                            contentType: image.contentType,
                            originalWidth: dimensions.width,
                            originalHeight: dimensions.height,
                            analysis,
                        });

                        return { src: imageId };
                    } catch (imgErr) {
                        console.error(`⚠️ Failed to process image:`, imgErr.message);
                        return { src: `{{IMAGE_ERROR}}` };
                    }
                }),
            });

            return { html, imageMap };
        } catch (err) {
            console.error("❌ Alternative extraction failed:", err);
        }
    }

    // Get HTML content separately
    const { value: html } = await mammoth.convertToHtml({ buffer });

    // Inject image placeholders into HTML
    let modifiedHtml = html;
    for (const [imageId] of imageMap) {
        modifiedHtml += `<p><img src="${imageId}" /></p>`;
    }

    console.log(`✅ Total images extracted: ${imageMap.size}`);
    return { html: modifiedHtml, imageMap };
}

// === Extract Tables with Better Structure ===
async function extractTablesFromHTML(html) {
    const tables = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let match;

    while ((match = tableRegex.exec(html)) !== null) {
        const tableHTML = match[1];
        const rows = [];

        // Extract rows
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(tableHTML)) !== null) {
            const rowHTML = rowMatch[1];
            const cells = [];

            // Extract cells (th or td)
            const cellRegex = /<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi;
            let cellMatch;

            while ((cellMatch = cellRegex.exec(rowHTML)) !== null) {
                const cellText = cellMatch[1]
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                cells.push(cellText);
            }

            if (cells.length > 0) {
                rows.push(cells);
            }
        }

        if (rows.length > 0) {
            tables.push({ rows });
        }
    }

    console.log(`📊 Extracted ${tables.length} tables`);
    return tables;
}

// === Enhanced Extraction with Image Dimensions & Tables ===
async function extractDocumentStructure(buffer) {
    try {
        console.log("📄 Extracting text content...");
        const { value: rawText } = await mammoth.extractRawText({ buffer });

        console.log("🖼️ Extracting and analyzing images with dimensions...");
        const { html, imageMap } = await extractImagesWithDescriptions(buffer);

        console.log("📊 Extracting tables...");
        const tables = await extractTablesFromHTML(html);

        const { value: markdown } = await mammoth.convertToMarkdown({ buffer });

        const paragraphs = rawText.split('\n').filter(p => p.trim().length > 0);
        const wordCount = rawText.split(/\s+/).filter(w => w.length > 0).length;

        return {
            rawText,
            htmlContent: html,
            markdown,
            imageMap,
            tables,
            metadata: {
                wordCount,
                paragraphCount: paragraphs.length,
                imageCount: imageMap.size,
                tableCount: tables.length,
                hasTables: tables.length > 0,
                complexity: wordCount > 2000 ? 'complex' : wordCount > 500 ? 'moderate' : 'simple'
            }
        };
    } catch (err) {
        console.error("❌ Extraction failed:", err);
        throw err;
    }
}

// === Build Image Context String for Prompt ===
function buildImageContext(imageMap) {
    if (imageMap.size === 0) return "";

    let context = "\n\n📸 IMAGE DETAILS:\n";

    for (const [imageId, data] of imageMap.entries()) {
        const { analysis, originalWidth, originalHeight } = data;
        context += `
${imageId}:
  - Type: ${analysis.type}
  - Original Size: ${originalWidth}x${originalHeight}
  - Description: ${analysis.description}
  - Purpose: ${analysis.purpose}
  - Suggested Caption: ${analysis.suggestedCaption}
  ${analysis.visibleText ? `- Text in image: "${analysis.visibleText}"` : ''}
  ${analysis.keyElements?.length ? `- Key Elements: ${analysis.keyElements.join(', ')}` : ''}
`;
    }

    return context;
}

// === Build Table Context ===
function buildTableContext(tables) {
    if (tables.length === 0) return "";

    let context = "\n\n📊 TABLE DATA:\n";

    tables.forEach((table, index) => {
        context += `
Table ${index + 1}:
  - Rows: ${table.rows.length}
  - Columns: ${table.rows[0]?.length || 0}
  - Preview: ${JSON.stringify(table.rows.slice(0, 2))}
`;
    });

    return context;
}

// === AI Formatting with Enhanced Context ===
async function getSmartFormattingPlan(extracted) {
    const imageContext = buildImageContext(extracted.imageMap);
    const tableContext = buildTableContext(extracted.tables);

    const prompt = `You are a **Professional Document Formatting AI**.
Generate a **pure JSON formatting plan** for a polished, professional document.

DOCUMENT METADATA:
- Word count: ${extracted.metadata.wordCount}
- Paragraphs: ${extracted.metadata.paragraphCount}
- Images: ${extracted.metadata.imageCount}
- Tables: ${extracted.metadata.tableCount}
- Complexity: ${extracted.metadata.complexity}

${imageContext}
${tableContext}

### JSON Schema:
{
  "title": "string",
  "sections": [
    {
      "heading": "string",
      "elements": [
        { 
          "type": "text", 
          "content": "string",
          "style": "paragraph|heading|subheading|bold"
        },
        { 
          "type": "image", 
          "id": "{{IMAGE_X}}", 
          "caption": "use suggestedCaption from image analysis",
          "alignment": "left|center|right",
          "sizePreference": "maintain-aspect|fit-width"
        },
        {
          "type": "list",
          "items": ["string"]
        },
        {
          "type": "table",
          "tableIndex": 0,
          "title": "descriptive title for this table"
        }
      ]
    }
  ]
}

### IMAGE FORMATTING RULES:
1. **MUST include ALL images** listed above - do not skip any
2. Use the suggestedCaption from the image analysis
3. Set sizePreference to "fit-width" for charts/diagrams, "maintain-aspect" for photos/logos
4. Center-align charts and graphs, left-align screenshots, left-align logos/symbols
5. Place images logically based on their purpose:
   - Logos/symbols: Near the beginning or in relevant sections
   - Charts/graphs: In data-related sections with descriptive context
   - Screenshots: In instructional sections
   - Decorative images: Appropriate contextual placement

### TABLE FORMATTING RULES:
1. Give each table a descriptive title based on its content
2. Reference tables by their tableIndex (0, 1, 2, etc.)
3. Place tables in logical sections near related text
4. Tables will be automatically formatted with proper borders and styling

### CRITICAL RULES:
1. **NEVER modify actual text content** - preserve exactly as-is
2. Use ALL image descriptions to create meaningful captions
3. Include ALL tables found in the document
4. Create proper document hierarchy
5. Return ONLY valid JSON, no markdown or commentary

Document content:
"""${extracted.htmlContent.substring(0, 5000)}"""

Raw text:
"""${extracted.rawText.substring(0, 2000)}"""
`;

    console.log("🤖 Generating enhanced formatting plan...");

    const result = await retryWithBackoff(async () => {
        return await model.generateContent(prompt);
    });

    const response = await result.response.text();
    const plan = safeParse(response);

    // Validate that all images are included in the plan
    const imageIdsInPlan = new Set();
    for (const section of plan.sections || []) {
        for (const elem of section.elements || []) {
            if (elem.type === "image" && elem.id) {
                imageIdsInPlan.add(elem.id);
            }
        }
    }

    // Add missing images to the end
    const allImageIds = Array.from(extracted.imageMap.keys());
    const missingImages = allImageIds.filter(id => !imageIdsInPlan.has(id));

    if (missingImages.length > 0) {
        console.log(`⚠️ AI missed ${missingImages.length} images, adding them back...`);

        if (!plan.sections) plan.sections = [];

        // Create or append to an "Additional Images" section
        let additionalSection = plan.sections.find(s => s.heading === "Additional Content");
        if (!additionalSection) {
            additionalSection = {
                heading: "Additional Content",
                elements: []
            };
            plan.sections.push(additionalSection);
        }

        for (const imageId of missingImages) {
            const imgData = extracted.imageMap.get(imageId);
            additionalSection.elements.push({
                type: "image",
                id: imageId,
                caption: imgData.analysis.suggestedCaption || "Document image",
                alignment: "center",
                sizePreference: "maintain-aspect"
            });
        }
    }

    return plan;
}

// === Create Professional Table with Error Handling ===
function createProfessionalTable(tableData) {
    try {
        const rows = tableData.rows;
        if (!rows || rows.length === 0) return null;

        const tableBorder = {
            top: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
        };

        // Determine if first row should be header
        const hasHeader = rows.length > 1;
        const headerRow = hasHeader ? rows[0] : [];
        const dataRows = hasHeader ? rows.slice(1) : rows;

        const tableRows = [];

        // Add header row
        if (hasHeader && headerRow.length > 0) {
            tableRows.push(
                new TableRow({
                    children: headerRow.map(
                        (cell) =>
                            new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [new TextRun({
                                            text: String(cell || "").substring(0, 500), // Limit cell length
                                            bold: true
                                        })],
                                        alignment: AlignmentType.CENTER,
                                    })
                                ],
                                shading: { fill: "E8E8E8" },
                                borders: tableBorder,
                                verticalAlign: VerticalAlign.CENTER,
                            })
                    ),
                })
            );
        }

        // Add data rows
        for (const row of dataRows) {
            if (row.length > 0) {
                tableRows.push(
                    new TableRow({
                        children: row.map(
                            (cell, index) =>
                                new TableCell({
                                    children: [
                                        new Paragraph({
                                            text: String(cell || "").substring(0, 500), // Limit cell length
                                            alignment: index === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                                        })
                                    ],
                                    borders: tableBorder,
                                    verticalAlign: VerticalAlign.CENTER,
                                })
                        ),
                    })
                );
            }
        }

        return new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
        });
    } catch (err) {
        console.error("❌ Failed to create table:", err.message);
        return null;
    }
}

// === Build DOCX with Enhanced Image & Table Handling ===
async function buildDocxWithImages(plan, imageMap, extractedTables) {
    const children = [];

    // Title
    children.push(
        new Paragraph({
            text: sanitizeText(plan.title || "Formatted Document"),
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
        })
    );

    // Sections with intelligent element handling
    for (const sec of plan.sections || []) {
        if (sec.heading) {
            children.push(
                new Paragraph({
                    text: sanitizeText(sec.heading),
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 300, after: 150 },
                })
            );
        }

        if (Array.isArray(sec.elements)) {
            for (const elem of sec.elements) {
                if (elem.type === "image" && imageMap.has(elem.id)) {
                    const imgData = imageMap.get(elem.id);

                    try {
                        // Validate image buffer
                        if (!imgData.buffer || imgData.buffer.length === 0) {
                            console.error(`⚠️ Skipping ${elem.id}: empty buffer`);
                            continue;
                        }

                        // Calculate smart size based on original dimensions
                        const { width, height } = calculateImageSize(
                            imgData.originalWidth,
                            imgData.originalHeight,
                            elem.sizePreference === "maintain-aspect" ? 500 : 650
                        );

                        console.log(`   Adding ${elem.id}: ${imgData.originalWidth}x${imgData.originalHeight} → ${width}x${height}`);

                        // Determine alignment
                        const alignmentMap = {
                            left: AlignmentType.LEFT,
                            center: AlignmentType.CENTER,
                            right: AlignmentType.RIGHT
                        };
                        const alignment = alignmentMap[elem.alignment] || AlignmentType.CENTER;

                        // Add image with proper sizing - using Uint8Array for better compatibility
                        const imageData = imgData.buffer instanceof Uint8Array ?
                            imgData.buffer :
                            new Uint8Array(imgData.buffer);

                        children.push(
                            new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: imageData,
                                        transformation: { width, height },
                                        type: imgData.contentType.includes('png') ? 'png' :
                                            imgData.contentType.includes('gif') ? 'gif' : 'jpg',
                                    }),
                                ],
                                alignment,
                                spacing: { before: 200, after: 100 },
                            })
                        );

                        // Add AI-generated caption
                        if (elem.caption) {
                            children.push(
                                new Paragraph({
                                    children: [
                                        new TextRun({
                                            text: sanitizeText(elem.caption),
                                            italics: true,
                                            size: 20,
                                            color: "666666",
                                        })
                                    ],
                                    alignment: AlignmentType.CENTER,
                                    spacing: { after: 300 },
                                })
                            );
                        }
                    } catch (imgErr) {
                        console.error(`❌ Failed to add ${elem.id}:`, imgErr.message);
                        // Add error placeholder instead of breaking
                        children.push(
                            new Paragraph({
                                text: sanitizeText(`[Image could not be loaded: ${elem.caption || elem.id}]`),
                                italics: true,
                                color: "999999",
                            })
                        );
                    }
                } else if (elem.type === "table" && extractedTables[elem.tableIndex]) {
                    // Add table title
                    if (elem.title) {
                        children.push(
                            new Paragraph({
                                text: sanitizeText(elem.title),
                                heading: HeadingLevel.HEADING_2,
                                spacing: { before: 200, after: 150 },
                            })
                        );
                    }

                    // Add professionally formatted table
                    const table = createProfessionalTable(extractedTables[elem.tableIndex]);
                    if (table) {
                        children.push(table);
                        children.push(
                            new Paragraph({
                                text: "",
                                spacing: { after: 300 },
                            })
                        );
                    }
                } else if (elem.type === "text") {
                    const style = elem.style || "paragraph";
                    const heading = style === "heading" ? HeadingLevel.HEADING_2 :
                        style === "subheading" ? HeadingLevel.HEADING_3 :
                            undefined;

                    children.push(
                        new Paragraph({
                            text: sanitizeText(elem.content),
                            heading,
                            bold: style === "bold",
                            spacing: { after: 150 },
                        })
                    );
                } else if (elem.type === "list" && Array.isArray(elem.items)) {
                    for (const item of elem.items) {
                        children.push(
                            new Paragraph({
                                children: [new TextRun({ text: "• " + sanitizeText(item) })],
                                spacing: { after: 100 },
                                indent: { left: 360 },
                            })
                        );
                    }
                }
            }
        }
    }

    const doc = new Document({
        sections: [{
            children,
            properties: {
                page: {
                    margin: {
                        top: 1440,    // 1 inch
                        right: 1440,
                        bottom: 1440,
                        left: 1440,
                    },
                },
            },
        }],
    });

    return await Packer.toBuffer(doc);
}

// === API Endpoint ===
app.post("/api/format", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        console.log("📄 Starting enhanced document analysis...");
        const extracted = await extractDocumentStructure(req.file.buffer);

        console.log(`✅ Extracted: ${extracted.metadata.wordCount} words, ${extracted.imageMap.size} images, ${extracted.metadata.tableCount} tables`);

        const plan = await getSmartFormattingPlan(extracted);

        console.log("📝 Building professionally formatted document...");
        const buffer = await buildDocxWithImages(plan, extracted.imageMap, extracted.tables);

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        );
        res.setHeader("Content-Disposition", 'attachment; filename="formatted.docx"');
        res.send(buffer);

        console.log("✅ Document formatted successfully with proper images and tables!");
    } catch (err) {
        console.error("❌ Formatting failed:", err);
        res.status(500).json({ error: "Formatting failed", details: err.message });
    }
});

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`✅ Enhanced Formatter running on port ${PORT}`));
}

export default app;
