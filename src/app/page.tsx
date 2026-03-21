import { VerificationForm } from "@/components/VerificationForm";

export default function Home() {
  // Read the resource ID from the environment variable.
  // This is the journey SHA + version (e.g., "abc123...@latest").
  const resourceId =
    process.env.GBG_JOURNEY_RESOURCE_ID ??
    "2ec919f77eb9858f16a9c102913f68c2ede2e31952d3e2b8f5ca7028d5c480bc@latest";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <VerificationForm resourceId={resourceId} />

      {/* Footer */}
      <footer className="mt-12 text-center">
        <p className="text-xs text-slate-400">
          &copy; {new Date().getFullYear()} Powered by{" "}
          <a
            href="https://www.gbgplc.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-500 hover:text-gbg-700 transition-colors"
          >
            GBG
          </a>
          . All rights reserved.
        </p>
      </footer>
    </main>
  );
}
