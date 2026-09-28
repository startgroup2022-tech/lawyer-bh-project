type LiveOverviewDependencies = {
  authorize(request: Request): Promise<{ id: string } | null>;
  overview(countryCode: string): Promise<object>;
};

const headers = { "Cache-Control": "no-store" };

export function createLiveOverviewHttp(deps: LiveOverviewDependencies) {
  return async (request: Request): Promise<Response> => {
    if (!(await deps.authorize(request))) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401, headers });
    }
    const rawCountry = new URL(request.url).searchParams.get("country") ?? "";
    if (!/^[A-Za-z]{2}$/.test(rawCountry)) {
      return Response.json({ ok: false, error: "Invalid country" }, { status: 400, headers });
    }
    const overview = await deps.overview(rawCountry.toUpperCase());
    return Response.json({ ok: true, ...overview }, { headers });
  };
}
