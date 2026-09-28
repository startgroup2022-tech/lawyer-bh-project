import { describe, expect, it } from "vitest";
import { parseAboutMemberInput, parseAboutReorderInput, parseAboutSectionInput } from "./validation";

const member = {
  sectionId: "11111111-1111-4111-8111-111111111111",
  nameAr: " عمر ", nameEn: " Omar ", titleAr: " رئيس ", titleEn: " CEO ", slug: " omar ",
  schemaType: "Person", featured: true, previousExperienceAr: [" خبرة ", ""], previousExperienceEn: [" Experience "],
  experienceAr: [], experienceEn: [], yearsOfExperienceAr: " 10 سنوات ", yearsOfExperienceEn: " 10 years ",
  previousEmployerAr: " جهة ", previousEmployerEn: " Firm ", tasksAr: [" مهمة "], tasksEn: [" Task "],
  tasksLabelAr: " المهام ", tasksLabelEn: " Tasks ",
};

describe("About management validation", () => {
  it("normalizes bilingual section content", () => {
    expect(parseAboutSectionInput({ romanLabel: " II ", headingAr: " الإدارة ", headingEn: " Management " }))
      .toEqual({ romanLabel: "II", headingAr: "الإدارة", headingEn: "Management" });
  });
  it("normalizes member fields and removes blank list entries", () => {
    expect(parseAboutMemberInput(member)).toMatchObject({ nameAr: "عمر", nameEn: "Omar", previousExperienceAr: ["خبرة"], tasksEn: ["Task"] });
  });
  it("requires bilingual names for people but permits unnamed organizations", () => {
    expect(() => parseAboutMemberInput({ ...member, nameEn: "" })).toThrowError("bilingual_name_required");
    expect(parseAboutMemberInput({ ...member, schemaType: "Organization", nameAr: "", nameEn: "" })).toMatchObject({ nameAr: "", nameEn: "" });
  });
  it("rejects duplicate reorder ids", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(() => parseAboutReorderInput({ ids: [id, id] })).toThrowError("duplicate_order_id");
  });
});
