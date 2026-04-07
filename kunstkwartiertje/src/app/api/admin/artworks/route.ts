export async function GET() {
    return Response.json({ error: "Use /api/admin/requests?type=artworks instead." }, { status: 410 });
}

export async function PATCH() {
    return Response.json({ error: "Use /api/admin/requests with requestType=artwork instead." }, { status: 410 });
}
