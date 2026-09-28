import { handle, optionalJsonBody } from "@/lib/saraya/auth/http";
import { sessions } from "@/lib/saraya/auth/runtime";
import { parseRefreshRequest, webSessionResponse } from "@/lib/saraya/auth/security";
export async function POST(request: Request) { return handle(async () => { const input = parseRefreshRequest(request, await optionalJsonBody(request)); const value = await sessions().refresh(input.token); return input.web ? webSessionResponse(value) : Response.json(value); }); }
