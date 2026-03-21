import { NextResponse } from "next/server";
import { getCustomerToken } from "./token";

// This route is only used if you want to test auth independently
export async function POST() {
  try {
    await getCustomerToken();
    return NextResponse.json({ success: true, expiresIn: 7200 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 401 },
    );
  }
}
