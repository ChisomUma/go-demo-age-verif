"use client";

import { Check } from "lucide-react";
import type { InteractionPage } from "@/lib/types";

interface StepIndicatorProps {
  pages: InteractionPage[];
  currentIndex: number;
}

export function StepIndicator({ pages, currentIndex }: StepIndicatorProps) {
  return (
    <nav aria-label="Verification steps" className="mb-10">
      <ol className="flex items-center">
        {pages.map((page, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <li
              key={page.id}
              className="flex items-center last:flex-none flex-1"
            >
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full
                    text-sm font-semibold transition-all duration-300
                    ${
                      isCompleted
                        ? "bg-gbg-700 text-white shadow-md shadow-gbg-700/30"
                        : isCurrent
                          ? "bg-gbg-100 text-gbg-800 ring-2 ring-gbg-500 ring-offset-2"
                          : "bg-slate-100 text-slate-400"
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" strokeWidth={3} />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`
                    mt-2 text-xs font-medium text-center max-w-[100px]
                    ${isCurrent ? "text-gbg-800" : isCompleted ? "text-slate-600" : "text-slate-400"}
                  `}
                >
                  {page.label}
                </span>
              </div>

              {/* Connector line (not after last item) */}
              {idx < pages.length - 1 && (
                <div
                  className={`
                    mx-3 mt-[-1.5rem] h-0.5 flex-1 rounded-full transition-colors duration-300
                    ${idx < currentIndex ? "bg-gbg-700" : "bg-slate-200"}
                  `}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
