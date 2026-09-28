import { forwardClientAuthRequest } from "@/lib/client-auth-proxy";

export async function GET(request: Request) {
  return forwardClientAuthRequest("GET", "account", request);
}
