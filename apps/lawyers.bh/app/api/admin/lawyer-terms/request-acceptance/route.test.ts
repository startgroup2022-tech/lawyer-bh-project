import {beforeEach,describe,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({admin:null as null|{id:string}}));
const requestAcceptance=vi.hoisted(()=>vi.fn(async()=>({targeted:4})));
vi.mock("server-only",()=>({}));
vi.mock("@/lib/auth/admin-access",()=>({requireAdminPermission:vi.fn(async()=>state.admin)}));
vi.mock("@/lib/terms-management/acceptance",()=>({requestExistingLawyerAcceptance:requestAcceptance}));
import {POST} from "./route";
describe("existing lawyer acceptance campaign",()=>{beforeEach(()=>{state.admin=null;vi.clearAllMocks()});it("requires permission",async()=>{expect((await POST(new Request("http://x",{method:"POST",body:"{}"}))).status).toBe(403)});it("requires confirmation and launches the version once authorized",async()=>{state.admin={id:"a"};expect((await POST(new Request("http://x",{method:"POST",body:JSON.stringify({versionId:"v",confirmation:"no"})}))).status).toBe(400);const response=await POST(new Request("http://x",{method:"POST",body:JSON.stringify({versionId:"v",confirmation:"REQUEST_ACCEPTANCE"})}));expect(response.status).toBe(200);expect(await response.json()).toEqual({ok:true,targeted:4})})});
