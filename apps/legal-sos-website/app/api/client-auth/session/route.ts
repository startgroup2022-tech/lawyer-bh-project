import { forwardClientAuthRequest } from "@/lib/client-auth-proxy";

export async function GET(request: Request) {
  return forwardClientAuthRequest("GET", "session", request);
}

export async function DELETE(request: Request) {
  return forwardClientAuthRequest("DELETE", "session", request);
}
