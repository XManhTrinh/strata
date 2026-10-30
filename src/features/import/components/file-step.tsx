"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { Alert, FileTrigger } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { type ParsedFile, parseFile } from "../parse-file";

const ACCEPT = [
  ".csv",
  "text/csv",
  ".xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

/** Choosing the file: parsed here in the browser, so it never leaves the device. */
export function FileStep({
  file,
  onFile,
  onNext,
}: {
  file: ParsedFile | null;
  onFile: (file: ParsedFile) => void;
  onNext: () => void;
}) {
  const t = useTranslations("import.file");
  const [error, setError] = useState(false);
  const [reading, setReading] = useState(false);

  async function read(chosen: File | undefined) {
    if (!chosen) return;
    setReading(true);
    setError(false);
    try {
      onFile(await parseFile(chosen));
    } catch {
      setError(true);
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-medium text-on-surface-variant">{t("help")}</p>
      {error && <Alert severity="error">{t("unreadable")}</Alert>}
      {file && (
        <p className="text-body-large text-on-surface">
          {t("summary", {
            name: file.name,
            rows: file.records.length,
            columns: file.headers.length,
          })}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <FileTrigger accept={ACCEPT} onSelect={(files) => void read(files[0])}>
          <Button
            variant={file ? "text" : "filled"}
            pending={reading}
            leadingIcon={<Icon name="upload_file" />}
          >
            {file ? t("another") : t("choose")}
          </Button>
        </FileTrigger>
        {file && file.records.length > 0 && (
          <Button variant="filled" onPress={onNext}>
            {t("next")}
          </Button>
        )}
      </div>
    </div>
  );
}
