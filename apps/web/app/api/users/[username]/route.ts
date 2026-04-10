import { NextResponse } from "next/server";
import { getAuthorProfile } from "@/lib/registry";

type RouteProps = {
  params: Promise<{ username: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { username } = await params;
  const profile = await getAuthorProfile(username);

  if (!profile) {
    return NextResponse.json({ error: "Author not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}
