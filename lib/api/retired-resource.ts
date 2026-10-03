import { NextResponse } from "next/server";

export function retiredResourceResponse() {
  return NextResponse.json(
    { error: "resource_retired" },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
