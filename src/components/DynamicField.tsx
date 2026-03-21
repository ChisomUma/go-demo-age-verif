"use client";

import { useRef } from "react";
import { Upload, X } from "lucide-react";
import type { FieldDef } from "@/lib/types";

interface DynamicFieldProps {
  field: FieldDef;
  value: string;
  error?: string;
  required: boolean;
  onChange: (value: string) => void;
}

export function DynamicField({
  field,
  value,
  error,
  required,
  onChange,
}: DynamicFieldProps) {
  const errorClass = error ? "!border-red-400 !ring-red-500/20" : "";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const labelSuffix = required ? (
    <span className="text-red-500">*</span>
  ) : (
    <span className="ml-1 text-xs font-normal text-slate-400">optional</span>
  );

  // ── File input ──────────────────────────────────────────────────────────
  if (field.type === "file") {
    const hasFile = !!value;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    };

    const handleClear = () => {
      onChange("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
      <div>
        <label className="input-label">
          {field.label} {labelSuffix}
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept={field.accept}
          onChange={handleFileChange}
          className="hidden"
          id={field.id}
        />

        {hasFile ? (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gbg-100">
              <Upload className="h-5 w-5 text-gbg-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                Document uploaded
              </p>
              <p className="text-xs text-slate-500">
                Click the X to remove and re-upload
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`
              flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed
              px-4 py-8 text-sm transition-colors
              ${error
                ? "border-red-300 bg-red-50 text-red-600 hover:border-red-400"
                : "border-slate-300 bg-slate-50 text-slate-500 hover:border-gbg-400 hover:bg-gbg-50 hover:text-gbg-700"
              }
            `}
          >
            <Upload className="h-5 w-5" />
            Click to upload your document
          </button>
        )}

        {error && <p className="input-error">{error}</p>}
        {field.hint && (
          <p className="mt-1 text-xs text-slate-400">{field.hint}</p>
        )}
      </div>
    );
  }

  // ── Select input ────────────────────────────────────────────────────────
  if (field.type === "select") {
    return (
      <div>
        <label htmlFor={field.id} className="input-label">
          {field.label} {labelSuffix}
        </label>
        <select
          id={field.id}
          className={`input-field ${errorClass}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={field.autoComplete}
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="input-error">{error}</p>}
        {field.hint && (
          <p className="mt-1 text-xs text-slate-400">{field.hint}</p>
        )}
      </div>
    );
  }

  // ── Standard input (text, email, tel, date) ─────────────────────────────
  return (
    <div>
      <label htmlFor={field.id} className="input-label">
        {field.label} {labelSuffix}
      </label>
      <input
        id={field.id}
        type={field.type}
        className={`input-field ${errorClass}`}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={field.autoComplete}
        {...(field.type === "date"
          ? { max: new Date().toISOString().split("T")[0] }
          : {})}
      />
      {error && <p className="input-error">{error}</p>}
      {field.hint && (
        <p className="mt-1 text-xs text-slate-400">{field.hint}</p>
      )}
    </div>
  );
}
