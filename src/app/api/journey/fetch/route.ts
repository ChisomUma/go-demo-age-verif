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

    // Log full interaction structure (cards, collects, pages)
    if (data?.interaction) {
      console.log("[journey/fetch] collects:", JSON.stringify(data.interaction.collects));
      console.log("[journey/fetch] consumes:", JSON.stringify(data.interaction.consumes));
      // Log card configs — DocumentCard may have upload URLs or secrets
      const pages = data.interaction?.resource?.data?.pages;
      if (pages) {
        for (const page of pages) {
          for (const card of page.cards || []) {
            if (card.config) {
              console.log(`[journey/fetch] Card ${card.id} config:`, JSON.stringify(card.config));
            }
          }
        }
      }
    }
    // Log any top-level keys we might be missing
    console.log("[journey/fetch] Top-level keys:", Object.keys(data));
    if (data?.interaction) {
      console.log("[journey/fetch] Interaction keys:", Object.keys(data.interaction));
      if (data.interaction.resource) {
        console.log("[journey/fetch] Resource keys:", Object.keys(data.interaction.resource));
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
