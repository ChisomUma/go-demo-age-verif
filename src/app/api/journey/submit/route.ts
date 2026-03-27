import { NextRequest, NextResponse } from "next/server";
import { getCustomerToken } from "../../auth/token";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = await getCustomerToken();

    // Extract private document image field from client
    const docImage: string | undefined = body._documentImage;
    delete body._documentImage;

    // If document image provided, add it in the correct GBG format:
    // context.subject.documents[{ side1Image, side2Image, type: "Primary" }]
    if (docImage) {
      const rawBase64 = docImage.replace(/^data:[^;]+;base64,/, "");
      body.context.subject.documents = [
        {
          side1Image: rawBase64,
          side2Image: "",
          type: "Primary",
        },
      ];
    }

    // Debug log (truncate base64)
    const debugPayload = JSON.parse(JSON.stringify(body));
    if (debugPayload?.context?.subject?.documents) {
      for (const doc of debugPayload.context.subject.documents) {
        for (const key of Object.keys(doc)) {
          if (typeof doc[key] === "string" && doc[key].length > 100) {
            doc[key] = doc[key].substring(0, 100) + "...[TRUNCATED]";
          }
        }
      }
    }
    console.log("[journey/submit] Payload:", JSON.stringify(debugPayload, null, 2));

    const res = await fetch(
      `${process.env.GBG_API_BASE_URL}/journey/interaction/submit`,
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
    console.log("[journey/submit] GBG response:", res.status, text.substring(0, 500));

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: `GBG returned non-JSON (${res.status}): ${text.slice(0, 500)}` },
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
