import { Suspense } from "react";
import AgentApplyClient from "./AgentApplyClient";

export const dynamic = "force-dynamic";

export default async function AgentApplyPage(props: { searchParams: Promise<{ portfolio?: string }> }) {
  const searchParams = await props.searchParams;
  const portfolio = searchParams?.portfolio || "Main Portfolio";

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading Agent Portal...</div>
      </div>
    }>
      <AgentApplyClient defaultPortfolio={portfolio} />
    </Suspense>
  );
}
