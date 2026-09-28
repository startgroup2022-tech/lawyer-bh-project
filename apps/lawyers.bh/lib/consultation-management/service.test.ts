import { beforeEach,describe,expect,it,vi } from "vitest";
const mocks=vi.hoisted(()=>({responses:[] as unknown[][],boundValues:[] as unknown[][],sql:vi.fn((input:TemplateStringsArray|string,...values:unknown[])=>{if(typeof input==="string")return input;mocks.boundValues.push(values);return Promise.resolve(mocks.responses.shift()??[])} )}));
vi.mock("server-only",()=>({}));vi.mock("@/lib/db/client",()=>({sqlClient:mocks.sql}));
import { deleteConsultationType,listAdminConsultationTypes,setConsultationTypeArchived } from "./service";
const country={code:"BH",tablePrefix:"bahrain",nameAr:"البحرين",nameEn:"Bahrain",currencyCode:"BHD",defaultLocale:"ar"};
describe("consultation management service",()=>{
 beforeEach(()=>{mocks.responses=[];mocks.boundValues=[];mocks.sql.mockClear()});
 it("lists active and archived catalogue rows",async()=>{mocks.responses.push([{id:"1",country_code:"BH",code:"phone",name_ar:"هاتف",name_en:"Phone",price:"30.000",currency_code:"BHD",duration_minutes:30,icon_key:"phone",sort_order:0,is_active:false,archived_at:"2026-01-01"}]);expect(await listAdminConsultationTypes(country)).toMatchObject([{id:"1",code:"phone",isActive:false}])});
 it("serializes the archive timestamp and clears it when restoring",async()=>{
  const archivedRow={id:"1",country_code:"BH",code:"phone",name_ar:"هاتف",name_en:"Phone",price:"30.000",currency_code:"BHD",duration_minutes:30,icon_key:"phone",sort_order:0,is_active:false,archived_at:"2026-01-01T00:00:00.000Z"};
  mocks.responses.push([archivedRow],[{...archivedRow,is_active:true,archived_at:null}]);

  await setConsultationTypeArchived(country,"1",true,{adminId:"admin"});
  await setConsultationTypeArchived(country,"1",false,{adminId:"admin"});

  expect(mocks.boundValues[0]).toEqual(expect.arrayContaining([expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)]));
  expect(mocks.boundValues[0].some(value=>value instanceof Date)).toBe(false);
  expect(mocks.boundValues[1]).toEqual(expect.arrayContaining([null]));
 });
 it("requires archive before permanent deletion",async()=>{mocks.responses.push([{is_active:true}]);await expect(deleteConsultationType(country,"1")).rejects.toThrow("archive_before_delete")});
});
