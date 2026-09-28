import { beforeEach, it, expect, vi } from "vitest";
const mocks=vi.hoisted(()=>({sql:vi.fn(),country:vi.fn(),cases:vi.fn(),account:vi.fn()}));
vi.mock("@/lib/db/client",()=>({sqlClient:mocks.sql}));
vi.mock("@/lib/db/country-tables",()=>({getActiveCountry:mocks.country}));
vi.mock("@/lib/sos/emergencyCaseCatalog",()=>({listEmergencyCaseTypes:mocks.cases}));
vi.mock("@/lib/client-auth/request-account",()=>({resolveOptionalClientAccount:mocks.account}));
import { POST } from "./route";
beforeEach(()=>{
  vi.resetAllMocks();
  mocks.country.mockResolvedValue({code:"BH"});
  mocks.cases.mockResolvedValue([{id:"case1",slug:"search",baseFeeBhd:12.345,currencyCode:"BHD"}]);
  mocks.account.mockResolvedValue(null);
  mocks.sql.mockResolvedValue([{id:"code1",code:"SAVE20",scope:"app",discount_type:"percentage",discount_value:"20",is_active:true,total_usage_limit:null,per_user_usage_limit:null,total_used:0,user_used:0}]);
});
function request(){return new Request("https://example.test/api/mobile/discounts/quote",{method:"POST",body:JSON.stringify({caseId:"case1",countryCode:"BH",discountCode:"SAVE20",amount:0.001,channel:"website",customer:{email:"synthetic@example.invalid"}})});}
it("uses catalogue price and ignores supplied channel and amount",async()=>{
  const response=await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({quote:{finalAmountBd:"9.876",originalAmountBd:"12.345"}});
});
it("rejects website-only codes at the mobile route",async()=>{
  mocks.sql.mockResolvedValue([{scope:"website",is_active:true}]);
  const response=await POST(request());
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({errorCode:"wrong_channel"});
});
