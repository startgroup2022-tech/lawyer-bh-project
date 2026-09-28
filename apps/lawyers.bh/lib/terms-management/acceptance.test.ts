import { describe, expect, it } from "vitest";
import { createLawyerTermsAcceptanceService, TermsAcceptanceRequiredError } from "./acceptance";

function memoryRepository() {
  const pending = new Map<string,string>();
  const accepted = new Set<string>();
  return {
    pending, accepted,
    repo: {
      async getPending(lawyerId:string){ const versionId=pending.get(lawyerId); return versionId ? {lawyerId,versionId}:null; },
      async listCampaignTargets(versionId:string){ return ["l1","l2"].filter(id=>!accepted.has(`${id}:${versionId}`)); },
      async createPending(lawyerId:string,versionId:string){ if(!pending.has(lawyerId)) pending.set(lawyerId,versionId); },
      async accept(lawyerId:string,versionId:string){ accepted.add(`${lawyerId}:${versionId}`); if(pending.get(lawyerId)===versionId) pending.delete(lawyerId); },
      async transaction<T>(work:(repo:any)=>Promise<T>){ return work(this); },
    }
  };
}

describe("lawyer terms acceptance enforcement",()=>{
  it("creates an idempotent campaign only for lawyers that still need the version",async()=>{const m=memoryRepository();const s=createLawyerTermsAcceptanceService(m.repo);expect(await s.requestExistingLawyerAcceptance("v2",{adminId:"a"})).toEqual({targeted:2});expect(await s.requestExistingLawyerAcceptance("v2",{adminId:"a"})).toEqual({targeted:2});expect(m.pending.size).toBe(2)});
  it("blocks a targeted lawyer until the exact version is accepted",async()=>{const m=memoryRepository();const s=createLawyerTermsAcceptanceService(m.repo);await s.requestExistingLawyerAcceptance("v2",{adminId:"a"});await expect(s.assertLawyerRequestAccess("l1")).rejects.toBeInstanceOf(TermsAcceptanceRequiredError);await expect(s.acceptRequiredLawyerTerms("l1","v1",{})).rejects.toThrow("terms_version_stale");await s.acceptRequiredLawyerTerms("l1","v2",{});await expect(s.assertLawyerRequestAccess("l1")).resolves.toBeUndefined()});
  it("does not block a lawyer without a pending request",async()=>{const s=createLawyerTermsAcceptanceService(memoryRepository().repo);await expect(s.assertLawyerRequestAccess("other")).resolves.toBeUndefined()});
});
