"use client";

import { useState, useCallback } from "react";
import {
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import type { InteractionFetchResponse, FormValues } from "@/lib/types";
import {
  startJourney,
  pollForInteraction,
  fetchJourneyState,
} from "@/lib/api";
import { buildSubjectPayload, resolveDomainElements } from "@/lib/domain-mapper";
import { validatePage } from "@/lib/validation";
import { StepIndicator } from "./StepIndicator";
import { CardRenderer } from "./CardRenderer";

type Stage = "idle" | "starting" | "form" | "submitting" | "polling" | "result";

interface Props {
  resourceId: string;
}

export function VerificationForm({ resourceId }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [interaction, setInteraction] = useState<InteractionFetchResponse | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [journeyResult, setJourneyResult] = useState<{
    status: string;
    data?: Record<string, unknown>;
  } | null>(null);

  const [formValues, setFormValues] = useState<FormValues>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const pages = interaction?.interaction?.resource?.data?.pages ?? [];
  const currentPage = pages[currentPageIndex];
  const isLastPage = currentPageIndex === pages.length - 1;

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  const handleBegin = async () => {
    setStage("starting");
    setGlobalError(null);
    try {
      const startRes = await startJourney(resourceId);
      if (!startRes?.instanceId) throw new Error("No instance ID returned.");
      setInstanceId(startRes.instanceId);
      const interactionData = await pollForInteraction(startRes.instanceId);
      if (!interactionData?.interaction?.resource?.data?.pages?.length) {
        throw new Error("No interaction pages returned.");
      }
      setInteraction(interactionData);
      setCurrentPageIndex(0);
      setStage("form");
    } catch (err) {
      setGlobalError((err as Error).message);
      setStage("idle");
    }
  };

  const handleNext = async () => {
    if (!interaction || !currentPage) return;
    const cardIds = currentPage.cards.map((c) => c.id);
    const pageDomainElements = resolveDomainElements(cardIds);
    const pageErrors = validatePage(
      formValues, pageDomainElements, interaction.interaction.collects,
    );
    if (Object.keys(pageErrors).length > 0) { setErrors(pageErrors); return; }
    if (!isLastPage) { setCurrentPageIndex((prev) => prev + 1); setErrors({}); return; }
    await handleSubmitAll();
  };

  /**
   * Final submit flow:
   * 1. Start journey WITH document prefilled (side1Image in subject.documents)
   * 2. Fetch interaction
   * 3. Submit text fields only (exclude PrimaryDocument from participants)
   *    → The doc was already provided at start, so PrimaryDocument is pre-satisfied
   * 4. After submit, the journey might produce MORE interactions for the modules.
   *    We keep fetching and auto-submitting until the journey completes.
   */
  const handleSubmitAll = async () => {
    setStage("submitting");
    setGlobalError(null);

    try {
      // ── 1. Start journey (no prefill — doc goes in the submit) ────────
      const startRes = await startJourney(resourceId);
      if (!startRes?.instanceId) throw new Error("No instance ID returned.");
      const rid = startRes.instanceId;
      console.log("[flow] Journey started:", rid);

      // ── 2. Fetch interaction ──────────────────────────────────────────
      const inter = await pollForInteraction(rid);
      if (!inter?.interactionId) throw new Error("No interaction returned.");
      console.log("[flow] Got interaction:", inter.interactionId);

      // ── 3. Build full payload with ALL elements including document ────
      const allCardIds = pages.flatMap((p) => p.cards.map((c) => c.id));
      const allDomainElements = resolveDomainElements(allCardIds);
      const participants = allDomainElements.map((id) => ({ domainElementId: id }));
      const subject = buildSubjectPayload(formValues, allDomainElements);

      // Pass document image separately — the server-side route will figure
      // out the correct placement in the GBG payload.
      const docImage = formValues.documentImage || "";

      // ── 4. Submit via our API route (it handles doc formatting) ───────
      const res = await fetch("/api/journey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceId: rid,
          interactionId: inter.interactionId,
          participants,
          context: { subject },
          _documentImage: docImage, // private field for server-side processing
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message ?? data?.error ?? data?.errors?.[0]?.problem ?? "Submit failed";
        throw new Error(msg);
      }
      console.log("[flow] Submit succeeded");

      // ── 5. Poll for completion ────────────────────────────────────────
      setStage("polling");

      const MAX_POLLS = 60;
      const INTERVAL = 3000;

      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, INTERVAL));
        const state = await fetchJourneyState(rid);
        console.log(`[poll ${i + 1}] status=${state.status}`);

        if (state.status === "Completed" || state.status === "Failed") {
          setJourneyResult({ status: state.status, data: state.data ?? undefined });
          setStage("result");
          return;
        }
      }

      setJourneyResult({ status: "InProgress" });
      setStage("result");
    } catch (err) {
      setGlobalError((err as Error).message);
      setStage("form");
    }
  };

  const handleBack = () => {
    if (currentPageIndex > 0) { setCurrentPageIndex((prev) => prev - 1); setErrors({}); }
  };

  const handleReset = () => {
    setStage("idle"); setInteraction(null); setInstanceId(null);
    setJourneyResult(null); setFormValues({}); setCurrentPageIndex(0);
    setErrors({}); setGlobalError(null);
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gbg-100">
          <Shield className="h-7 w-7 text-gbg-700" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Identity verification
        </h1>
        <p className="mt-2 text-sm text-slate-500">Powered by GBG GO — secure, fast, and compliant.</p>
      </div>

      {globalError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">Something went wrong</p>
              <p className="mt-0.5 text-sm text-red-600">{globalError}</p>
            </div>
          </div>
        </div>
      )}

      {stage === "idle" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <p className="mb-6 text-sm text-slate-600">Click below to begin.</p>
            <button onClick={handleBegin} className="btn-primary">
              Begin verification <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {stage === "starting" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-gbg-600" />
            <p className="font-medium text-slate-700">Starting your journey...</p>
          </div>
        </div>
      )}

      {stage === "form" && interaction && currentPage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <StepIndicator pages={pages} currentIndex={currentPageIndex} />
          <h2 className="mb-6 font-display text-xl font-semibold text-slate-900">{currentPage.label}</h2>
          <div className="space-y-6">
            {currentPage.cards.map((card) => (
              <CardRenderer key={card.id} card={card} formValues={formValues}
                collects={interaction.interaction.collects} onChange={handleFieldChange} errors={errors} />
            ))}
          </div>
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            <button onClick={handleBack} disabled={currentPageIndex === 0} className="btn-secondary disabled:invisible">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={handleNext} className="btn-primary">
              {isLastPage ? "Submit" : "Continue"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {(stage === "submitting" || stage === "polling") && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-gbg-600" />
            <div className="text-center">
              <p className="font-medium text-slate-700">
                {stage === "submitting" ? "Submitting your data..." : "Verifying your identity..."}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {stage === "submitting"
                  ? "Uploading document and sending information."
                  : "The platform is processing. This may take a moment."}
              </p>
            </div>
          </div>
        </div>
      )}

      {stage === "result" && journeyResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {journeyResult.status === "Completed" ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900">Verification complete</h2>
                <p className="mt-2 text-sm text-slate-500">Your identity has been successfully verified.</p>
              </>
            ) : journeyResult.status === "Failed" ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900">Verification failed</h2>
                <p className="mt-2 text-sm text-slate-500">Unable to verify your identity.</p>
              </>
            ) : (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <Loader2 className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900">Still processing</h2>
                <p className="mt-2 text-sm text-slate-500">Check back shortly.</p>
              </>
            )}
            <button onClick={handleReset} className="btn-secondary mt-6">
              <RotateCcw className="h-4 w-4" /> Start new verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
