import express from "express";
import path from "path";
import multer from "multer";
import os from "os";
import fs from "fs/promises";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Setup Multer for parsing multipart/form-data
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No audio or video file uploaded." });
    return;
  }

  const { sourceLang, targetLang } = req.body;
  if (!sourceLang || !targetLang) {
    res.status(400).json({ error: "Source and target languages are required." });
    return;
  }

  let uploadResult;

  try {
    // 1. Upload the file to Gemini via File API (required for large audio/video)
    uploadResult = await ai.files.upload({
      file: req.file.path,
      config: { mimeType: req.file.mimetype },
    });

    const isAutoDetect = sourceLang === "auto";
    const srcLangText = isAutoDetect ? "its original language" : sourceLang;

    // 2. Build the system & user prompts dynamically
    const systemInstruction = 
      "You are an expert translator and theologian. You adopt a respectful, formal register adapted to religious/theological speech.";

    const prompt = `This audio is in ${srcLangText}.
Please:
1. Transcribe the full audio with timestamps every 30 seconds in format [HH:MM:SS]
2. Translate the full content into ${targetLang}, preserving oratorical style and theological terminology, keeping timestamps
3. Write a structured summary in ${targetLang} with: Central Theme, Main Points, Notable Quotes (with timestamps), Conclusion, Observations.
Separate the three sections EXACTLY with: \n\n--- TRANSCRIPTION ---\n\n, \n\n--- TRANSLATION ---\n\n, \n\n--- SUMMARY ---\n\n`;

    // 3. Generate Content (Streaming to give the client immediate chunks)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      contents: [
        { fileData: { fileUri: uploadResult.uri, mimeType: uploadResult.mimeType } },
        { text: prompt }
      ],
      config: {
        systemInstruction: systemInstruction,
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        // Send format: data: {"text": "chunk data"}
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error("Gemini API Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "An error occurred during transcription and translation." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "An error occurred during processing." })}\n\n`);
      res.end();
    }
  } finally {
    // Cleanup the local temp file
    try {
      if (req.file) {
        await fs.unlink(req.file.path);
      }
    } catch (e) {
      console.error("Error deleting local temp file:", e);
    }
    // Note: To be fully clean, we should also delete the file from Gemini
    // wait for processing to finish, but File API files auto-delete after 48h
    try {
      if (uploadResult && uploadResult.name) {
        await ai.files.delete({ name: uploadResult.name });
      }
    } catch (e) {
      console.error("Error deleting Gemini temp file:", e);
    }
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
