import { handle } from "@/lib/saraya/auth/http";
import { publicInventoryService } from "@/lib/saraya/public-inventory/runtime";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ unitId: string }> },
) {
  return handle(async () => {
    const { unitId } = await params;
    return Response.json(await publicInventoryService.detail(unitId));
  });
}
