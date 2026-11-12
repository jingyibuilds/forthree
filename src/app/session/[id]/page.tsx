import { notFound } from "next/navigation";
import Runner from "@/components/runner";
import { findPart, loadBlocks } from "@/lib/study/content";

export const dynamic = "force-dynamic";

async function locate(id: string) {
  try {
    const {part, block} = await findPart(id);
    const name = (await loadBlocks()).find(candidate => candidate.block === block)?.name ?? "";
    return {partId: part.id, name};
  } catch {
    return null;
  }
}

export default async function Session({params}: {params: Promise<{id: string}>}) {
  const found = await locate((await params).id);
  if (!found) notFound();
  return <Runner partId={found.partId} blockName={found.name} />;
}
