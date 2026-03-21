import { NextRequest, NextResponse } from "next/server";
import { getCustomerToken } from "../../auth/token";

export async function POST(req: NextRequest) {
  try {
    const { instanceId } = await req.json();
    const token = await getCustomerToken();

    const res = await fetch(
      `${process.env.GBG_API_BASE_URL}/journey/interaction/fetch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ instanceId }),
        cache: "no-store",
      },
    );

    const data = await res.json();
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
