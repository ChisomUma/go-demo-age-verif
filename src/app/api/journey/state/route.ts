import { NextRequest, NextResponse } from "next/server";
import { getCustomerToken } from "../../auth/token";

export async function POST(req: NextRequest) {
  try {
    const { instanceId } = await req.json();
    const token = await getCustomerToken();

    const res = await fetch(
      `${process.env.GBG_API_BASE_URL}/journey/state/fetch`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceId,
          filterKeys: ["/.*/"],
        }),
        cache: "no-store",
      },
    );

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    // Normalize: GBG may return status at top level or nested under journey
    const status =
      data.status ?? data.journey?.status ?? "InProgress";

    return NextResponse.json({
      instanceId: data.instanceId ?? instanceId,
      status,
      metaData: data.metaData ?? data.journey?.metaData,
      context: data.context,
      data: data.data ?? data.journey?.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
