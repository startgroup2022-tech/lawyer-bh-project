import { forwardClientAuthRequest } from "@/lib/client-auth-proxy";

export async function POST(request: Request) {
  return forwardClientAuthRequest("POST", "request", request);
}
