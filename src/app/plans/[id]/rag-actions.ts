"use server";

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// This whole feature only works when the app is running locally (`npm run
// dev`) with rag/.venv set up per rag/README.md — it spawns a local Python
// process, which isn't available once deployed. `web/` is always the cwd
// a Next.js server action runs from, so the project root (and rag/) is one
// level up.
const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const PYTHON_PATH = path.join(
  PROJECT_ROOT,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python"
);
const QUERY_SCRIPT = path.join(PROJECT_ROOT, "rag", "query.py");

// Trades quality for speed since this runs synchronously from a page
// action rather than a long-lived terminal session — see rag/query.py
// --model to use the full llama3.2 model instead, from the CLI.
const WEB_CHAT_MODEL = "llama3.2:1b";

export interface KnowledgeBaseAnswer {
  answer: string;
  sources: { source: string; page: number }[];
}

export async function askKnowledgeBase(
  question: string
): Promise<KnowledgeBaseAnswer> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error("Ask a question first.");
  }

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      PYTHON_PATH,
      [QUERY_SCRIPT, trimmed, "--model", WEB_CHAT_MODEL, "--json"],
      { cwd: PROJECT_ROOT, timeout: 60_000 }
    ));
  } catch {
    throw new Error(
      "Couldn't reach the local knowledge base — is this running locally with rag/ set up?"
    );
  }

  try {
    return JSON.parse(stdout.trim()) as KnowledgeBaseAnswer;
  } catch {
    throw new Error("The local knowledge base returned an unexpected response.");
  }
}
