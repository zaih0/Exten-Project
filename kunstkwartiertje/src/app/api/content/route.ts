import { NextResponse } from "next/server";
import { getPublicSiteContent } from "src/utils/getPublicSiteContent";

export async function GET() {
    try {
        const content = await getPublicSiteContent();

        return NextResponse.json(
            { content },
            {
                headers: {
                    "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
                },
            },
        );
    } catch (error) {
        console.error("Public content GET error", error);
        return NextResponse.json({ error: "Serverfout bij ophalen websitecontent." }, { status: 500 });
    }
}
