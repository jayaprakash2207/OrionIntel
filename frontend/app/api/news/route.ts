import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || "financial markets";
  const limit = searchParams.get("limit") || "20";
  const res = await fetch(
    `${BACKEND}/api/news/latest?query=${encodeURIComponent(query)}&limit=${limit}`
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
