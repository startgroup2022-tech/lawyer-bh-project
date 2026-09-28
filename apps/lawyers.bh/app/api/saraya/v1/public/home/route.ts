import { handle } from "@/lib/saraya/auth/http";
import { publicInventoryService } from "@/lib/saraya/public-inventory/runtime";

export async function GET(request: Request) {
  return handle(async () => {
    const requested = Number(new URL(request.url).searchParams.get("limit"));
    return Response.json(await publicInventoryService.home(requested));
  });
}
