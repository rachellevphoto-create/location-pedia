import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isCloudinaryConfigured, signUpload } from "@/lib/cloudinary";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "NOT_APPROVED" }, { status: 403 });
  }
  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "CLOUDINARY_NOT_CONFIGURED" },
      { status: 503 },
    );
  }
  const sig = signUpload({ tags: ["photoloc", `user:${session.user.id}`] });
  return NextResponse.json(sig);
}
