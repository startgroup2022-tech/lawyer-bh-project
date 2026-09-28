import type { BuilderTemplate } from "./builder-model";
function legalReference(template: BuilderTemplate, key: string) {
  const marker = `{{${key}}}`;
  return [
    template.title.ar,
    template.title.en,
    ...template.clauses.flatMap((c) => [
      c.title.ar,
      c.title.en,
      c.body.ar,
      c.body.en,
    ]),
    ...(template.additionalLanguages ?? []).flatMap((language) => [language.title, language.content, language.footer, language.firstPartyDetails ?? "", language.secondPartyDetails ?? ""]),
  ].some((text) => text.includes(marker));
}
export function builderFieldInUse(template: BuilderTemplate, id: string) {
  return (
    legalReference(template, `field.${id}`) ||
    [...template.parties.first.rows, ...template.parties.second.rows].some(
      (r) => r.source.kind === "field" && r.source.fieldId === id,
    )
  );
}
export function builderRowInUse(
  template: BuilderTemplate,
  side: "first" | "second",
  id: string,
) {
  return (
    legalReference(template, `${side}.${id}`) ||
    (side === "first" &&
      template.footer.rows.some(
        (r) => r.source.kind === "first" && r.source.rowId === id,
      ))
  );
}
