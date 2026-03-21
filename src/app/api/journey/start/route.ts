import { NextRequest, NextResponse } from "next/server";
import { getCustomerToken } from "../../auth/token";

export async function POST(req: NextRequest) {
  try {
    const { resourceId } = await req.json();
    const token = await getCustomerToken();

    const res = await fetch(
      `${process.env.GBG_API_BASE_URL}/journey/start`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId,
          context: {
            config: { delivery: "api" },
            subject: {},
          },
        }),
        cache: "no-store",
      },
    );

    const data = await res.json();
    console.log("[journey/start] GBG response:", res.status, JSON.stringify(data, null, 2));

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
