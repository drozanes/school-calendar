import { NextResponse } from "next/server";
import { fetchScheduleData } from "@/utils/googleSheets";

export async function GET() {
  try {
    const data = await fetchScheduleData();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to fetch schedule data:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch schedule data" }, { status: 500 });
  }
}
