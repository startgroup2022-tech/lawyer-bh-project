import { getActiveCountry } from "@/lib/db/country-tables";
import { listEmergencyCaseTypes } from "@/lib/sos/emergencyCaseCatalog";
import { loadDiscountQuote } from "@/lib/discounts/repository";
import { DiscountError } from "@/lib/discounts/service";
import { normalizeDiscountCode, parseBhdToFils } from "@/lib/discounts/pricing";
import { resolveOptionalClientAccount } from "@/lib/client-auth/request-account";
import { authFailure } from "@/lib/client-auth/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try { await resolveOptionalClientAccount(request); } catch(error) { return authFailure(error); }
  try {
    const raw=await request.text();
    if(raw.length>4096) return Response.json({ok:false,errorCode:"invalid"},{status:400});
    const body=JSON.parse(raw);
    if (!body || typeof body!=="object" || !normalizeDiscountCode(body.discountCode)) throw new DiscountError("invalid");
    const country=await getActiveCountry(String(body.countryCode??"BH").toUpperCase());
    if(!country) throw new DiscountError("invalid");
    const cases=await listEmergencyCaseTypes(country);
    const selected=cases.find(c=>c.id===body.caseId||c.slug===body.caseId);
    if(!selected || (selected.currencyCode||"BHD").toUpperCase()!=="BHD") throw new DiscountError("invalid");
    const customer=body.customer??{};
    const email=String(customer.email??"").trim();
    const phone=String(customer.phoneCountryCode??"").replace(/\D/g,"")+String(customer.phone??"").replace(/\D/g,"");
    if(!email&&!phone) throw new DiscountError("invalid");
    const quote=await loadDiscountQuote({code:body.discountCode,email:email||`phone:+${phone}`,
      originalFils:parseBhdToFils(selected.baseFeeBhd),channel:"app",includeReservations:true});
    return Response.json({ok:true,quote},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    return Response.json({ok:false,errorCode:error instanceof DiscountError?error.code:"invalid"},{status:400,headers:{"Cache-Control":"no-store"}});
  }
}
