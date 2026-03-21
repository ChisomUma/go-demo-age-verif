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
  submitInteraction,
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
  // ─── Journey state ─────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("idle");
  const [interaction, setInteraction] = useState<InteractionFetchResponse | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [journeyResult, setJourneyResult] = useState<{
    status: string;
    data?: Record<string, unknown>;
  } | null>(null);

  // ─── Form state (dynamic — keyed by field ID) ────────────────────────────
  const [formValues, setFormValues] = useState<FormValues>({});
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Derived: current interaction pages
  const pages = interaction?.interaction?.resource?.data?.pages ?? [];
  const currentPage = pages[currentPageIndex];
  const isLastPage = currentPageIndex === pages.length - 1;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  }, []);

  /** Step 1: Start the journey and poll for the first interaction. */
  const handleStart = async () => {
    setStage("starting");
    setGlobalError(null);

    try {
      const startResponse = await startJourney(resourceId);

      if (!startResponse?.instanceId) {
        throw new Error("Failed to start journey — no instance ID returned.");
      }

      const newInstanceId = startResponse.instanceId;
      setInstanceId(newInstanceId);

      // Poll until the platform produces an interaction
      const interactionData = await pollForInteraction(newInstanceId);

      if (!interactionData?.interaction?.resource?.data?.pages?.length) {
        throw new Error("No interaction pages returned. Please try again.");
      }

      setInteraction(interactionData);
      setCurrentPageIndex(0);
      setStage("form");
    } catch (err) {
      setGlobalError((err as Error).message);
      setStage("idle");
    }
  };

  /** Validate and advance to the next page, or submit on the last page. */
  const handleNext = async () => {
    if (!interaction || !currentPage || !instanceId) return;

    // Resolve which domain elements this page's cards collect
    const cardIds = currentPage.cards.map((c) => c.id);
    const pageDomainElements = resolveDomainElements(cardIds);

    // Validate
    const pageErrors = validatePage(
      formValues,
      pageDomainElements,
      interaction.interaction.collects,
    );

    if (Object.keys(pageErrors).length > 0) {
      setErrors(pageErrors);
      return;
    }

    if (!isLastPage) {
      setCurrentPageIndex((prev) => prev + 1);
      setErrors({});
      return;
    }

    // ─── Last page: submit all collected data ────────────────────────────────
    setStage("submitting");
    setGlobalError(null);

    try {
      // Gather ALL domain elements collected across ALL pages
      const allCardIds = pages.flatMap((p) => p.cards.map((c) => c.id));
      const allDomainElements = resolveDomainElements(allCardIds);

      // Build participants array from collected domain elements
      const participants = allDomainElements.map((id) => ({
        domainElementId: id,
      }));

      // Build the canonical context.subject payload
      const subject = buildSubjectPayload(formValues, allDomainElements);

      await submitInteraction({
        instanceId,
        interactionId: interaction.interactionId,
        participants,
        context: { subject },
      });

      // After submit, poll for journey state
      setStage("polling");

      const MAX_POLLS = 30;
      const INTERVAL = 2000;

      for (let i = 0; i < MAX_POLLS; i++) {
        const state = await fetchJourneyState(instanceId);

        if (state.status !== "InProgress") {
          setJourneyResult({ status: state.status, data: state.data ?? undefined });
          setStage("result");
          return;
        }

        await new Promise((r) => setTimeout(r, INTERVAL));
      }

      // If we exhaust polls, show what we have
      setJourneyResult({ status: "InProgress" });
      setStage("result");
    } catch (err) {
      setGlobalError((err as Error).message);
      setStage("form");
    }
  };

  const handleBack = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex((prev) => prev - 1);
      setErrors({});
    }
  };

  const handleReset = () => {
    setStage("idle");
    setInteraction(null);
    setInstanceId(null);
    setJourneyResult(null);
    setFormValues({});
    setCurrentPageIndex(0);
    setErrors({});
    setGlobalError(null);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gbg-100">
          <Shield className="h-7 w-7 text-gbg-700" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
          Identity verification
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Powered by GBG GO — secure, fast, and compliant.
        </p>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {globalError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Something went wrong
              </p>
              <p className="mt-0.5 text-sm text-red-600">{globalError}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Idle: Start button ──────────────────────────────────────────── */}
      {stage === "idle" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <p className="mb-6 text-sm text-slate-600">
              Click below to begin the identity verification journey. We will
              walk you through a few short steps to collect and verify your
              identity information.
            </p>
            <button onClick={handleStart} className="btn-primary">
              Begin verification
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Starting: Loading ───────────────────────────────────────────── */}
      {stage === "starting" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-gbg-600" />
            <div className="text-center">
              <p className="font-medium text-slate-700">
                Starting your journey...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Initialising the verification process.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Form: Multi-step interaction ─────────────────────────────── */}
      {stage === "form" && interaction && currentPage && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <StepIndicator pages={pages} currentIndex={currentPageIndex} />

          {/* Page title */}
          <h2 className="mb-6 font-display text-xl font-semibold text-slate-900">
            {currentPage.label}
          </h2>

          {/* Render cards for this page */}
          <div className="space-y-6">
            {currentPage.cards.map((card) => (
              <CardRenderer
                key={card.id}
                card={card}
                formValues={formValues}
                collects={interaction.interaction.collects}
                onChange={handleFieldChange}
                errors={errors}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
            <button
              onClick={handleBack}
              disabled={currentPageIndex === 0}
              className="btn-secondary disabled:invisible"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <button onClick={handleNext} className="btn-primary">
              {isLastPage ? "Submit" : "Continue"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Outstanding elements indicator */}
          {interaction.outstanding.length > 0 && (
            <div className="mt-4 rounded-lg bg-slate-50 px-4 py-2.5">
              <p className="text-xs text-slate-500">
                <span className="font-medium">Still required:</span>{" "}
                {interaction.outstanding.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Submitting ──────────────────────────────────────────────────── */}
      {stage === "submitting" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-gbg-600" />
            <div className="text-center">
              <p className="font-medium text-slate-700">
                Submitting your data...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Sending your information for verification.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Polling for result ───────────────────────────────────────────── */}
      {stage === "polling" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-gbg-600" />
            <div className="text-center">
              <p className="font-medium text-slate-700">
                Verifying your identity...
              </p>
              <p className="mt-1 text-sm text-slate-500">
                The platform is processing your data. This may take a moment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────────────── */}
      {stage === "result" && journeyResult && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center text-center">
            {journeyResult.status === "Completed" ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Verification complete
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Your identity has been successfully verified.
                </p>
              </>
            ) : journeyResult.status === "Failed" ? (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Verification failed
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  We were unable to verify your identity. Please try again or
                  contact support.
                </p>
              </>
            ) : (
              <>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                  <Loader2 className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  Still processing
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  The verification is still in progress. Check back shortly.
                </p>
              </>
            )}

            <button onClick={handleReset} className="btn-secondary mt-6">
              <RotateCcw className="h-4 w-4" />
              Start new verification
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
