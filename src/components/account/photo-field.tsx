"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MAX_EDGE = 256;

export function Avatar({
  photo,
  name,
  className,
  shape = "circle",
}: {
  photo?: string | null;
  name: string;
  className?: string;
  shape?: "circle" | "rounded";
}) {
  const radius = shape === "rounded" ? "rounded-lg" : "rounded-full";
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- the photo is a data URL the person uploaded; next/image has nothing to optimise
    return <img src={photo} alt="" className={cn(radius, "object-cover", className)} />;
  }
  return (
    <span className={cn("flex items-center justify-center bg-muted font-medium text-foreground", radius, className)}>
      {(name || "S").slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PhotoField({
  photo,
  name,
  canEdit,
  pending,
  onChange,
  appearance = "stack",
}: {
  photo?: string | null;
  name: string;
  canEdit: boolean;
  pending?: boolean;
  onChange: (photo: string | null) => void;
  appearance?: "stack" | "inline";
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function pick(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError(t("profile.photoInvalid"));
      return;
    }
    try {
      onChange(await resizePhoto(file));
    } catch {
      setError(t("profile.photoInvalid"));
    }
  }

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept="image/png,image/jpeg,image/webp"
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        void pick(file);
      }}
    />
  );

  if (appearance === "inline") {
    return (
      <div>
        <div className="flex items-center justify-between gap-3">
          <Avatar photo={photo} name={name} shape="rounded" className="size-9 text-[13px]" />
          {canEdit ? (
            <div className="flex items-center gap-4">
              <button type="button" className="text-[13px] hover:underline" disabled={pending} onClick={() => input.current?.click()}>
                {t("settings.edit")}
              </button>
              {photo ? (
                <button type="button" className="text-[13px] text-muted-foreground hover:text-foreground" disabled={pending} onClick={() => onChange(null)}>
                  {t("profile.removePhoto")}
                </button>
              ) : null}
            </div>
          ) : null}
          {fileInput}
        </div>
        {error ? <p role="alert" className="mt-2 text-[13px] text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar photo={photo} name={name} className="size-16 text-[20px]" />
      {canEdit ? (
        <div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" disabled={pending} onClick={() => input.current?.click()}>
              {t("profile.uploadPhoto")}
            </Button>
            {photo ? (
              <Button type="button" variant="ghost" disabled={pending} onClick={() => onChange(null)}>
                {t("profile.removePhoto")}
              </Button>
            ) : null}
          </div>
          <p className="mt-2 text-[12px] text-muted-foreground">{t("profile.photoHint")}</p>
          {error ? <p role="alert" className="mt-2 text-[13px] text-destructive">{error}</p> : null}
          {fileInput}
        </div>
      ) : null}
    </div>
  );
}

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(MAX_EDGE / image.width, MAX_EDGE / image.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("canvas"));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}
