"use client";

import { useState } from "react";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

export function PdfUpload({
  onExtracted,
  onBack,
}: {
  onExtracted: (title: string, text: string) => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "extracting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("extracting");
    setError(null);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text +=
          content.items
            .map((item) => ("str" in item ? (item as TextItem).str : ""))
            .join(" ") + "\n";
      }

      if (!text.trim()) {
        setStatus("error");
        setError("Couldn't extract any text from this PDF (it may be scanned images).");
        return;
      }

      onExtracted(file.name.replace(/\.pdf$/i, ""), text);
    } catch {
      setStatus("error");
      setError("Couldn't read this PDF. Try another file.");
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <button
        type="button"
        onClick={onBack}
        className="-m-1.5 self-start p-1.5 text-sm text-muted"
      >
        ← Back
      </button>
      <h1 className="text-lg font-semibold">Upload a PDF</h1>
      <p className="text-sm text-muted">
        Text is extracted in your browser — only the extracted text is sent
        for analysis, never the file itself.
      </p>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        disabled={status === "extracting"}
        className="text-sm file:mr-3 file:rounded-md file:border file:border-black/15 file:bg-transparent file:px-3 file:py-1.5 file:text-sm dark:file:border-white/20"
      />

      {status === "extracting" && (
        <p className="text-sm text-muted">Extracting text…</p>
      )}
      {status === "error" && error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
