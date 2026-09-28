import { handle } from "@/lib/saraya/auth/http";
import { publicInventoryService } from "@/lib/saraya/public-inventory/runtime";

export async function GET(request: Request) {
  return handle(async () => {
    const searchParams = new URL(request.url).searchParams;
    const requested = Number(searchParams.get("limit"));
    return Response.json(
      await publicInventoryService.list(
        requested,
        searchParams.get("cursor") ?? undefined,
      ),
    );
  });
}
