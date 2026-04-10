import { NextResponse } from "next/server";
import { listTags } from "@/lib/registry";

export async function GET() {
  const tags = await listTags();
  return NextResponse.json({ items: tags });
}
