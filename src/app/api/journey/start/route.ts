import { NextRequest, NextResponse } from "next/server";
import { getCustomerToken } from "../../auth/token";

export async function POST(req: NextRequest) {
  try {
    const { resourceId, documentImage } = await req.json();
    const token = await getCustomerToken();

    // Build subject context — include document if provided (prefill mode)
    const subject: Record<string, unknown> = {};
    if (documentImage) {
      // Strip data URI prefix to get raw base64
      const raw = documentImage.replace(/^data:[^;]+;base64,/, "");
      subject.documents = [{ side1Image: raw }];
    }

    const body = {
      resourceId,
      context: {
        config: { delivery: "api" },
        subject,
      },
    };

    console.log("[journey/start] Starting journey with document prefill:", !!documentImage);

    const res = await fetch(
      `${process.env.GBG_API_BASE_URL}/journey/start`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );

    const text = await res.text();
    console.log("[journey/start] GBG response:", res.status, text.substring(0, 500));

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: `GBG returned non-JSON (${res.status}): ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
