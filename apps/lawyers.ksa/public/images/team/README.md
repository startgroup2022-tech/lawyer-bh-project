# Team / leadership photos

Drop executive & leadership photos here. They are referenced from the About
page leadership section (`app/[locale]/about/Content.tsx`, the `execSections`
data → `photo` field).

## How to add a photo (no design work needed)

1. Save the photo in this folder using a kebab-case of the person's name, e.g.
   `omar-nabih-shaker.jpg`.
2. In `app/[locale]/about/Content.tsx`, find that person in `execSections` and
   set their `photo` field:

   ```ts
   {
     title: { en: "Chairman & CEO", ar: "…" },
     name:  { en: "Omar Nabih Shaker", ar: "…" },
     featured: true,
     photo: "/images/team/omar-nabih-shaker.jpg",   // ← add / uncomment this
     bio: { … },
   }
   ```

Until `photo` is set, the card shows a neutral silhouette placeholder — nothing
breaks, so members can be filled in one at a time as photos arrive.

## Image guidelines

- **Square crop**, face centred (the avatar is a circle, `object-cover`).
- Recommended ~**512×512px** (min 256×256). Featured cards render up to ~256px.
- Formats: `.jpg`, `.png`, or `.webp`. Keep each file under ~300 KB.

## Members awaiting a photo

| Name               | Role                                             | Expected filename          |
| ------------------ | ------------------------------------------------ | -------------------------- |
| Omar Nabih Shaker  | Chairman & CEO (featured)                        | `omar-nabih-shaker.jpg`    |
| Rashid Al-Ateeq    | EVP — Legal Affairs & Enforcement                | `rashid-al-ateeq.jpg`      |
| Khalid Al-Zayani   | EVP — Notarisation & Justice Services            | `khalid-al-zayani.jpg`     |
| Abdullah Al-Batti  | EVP — Senior Legal Advisory & Expertise          | `abdullah-al-batti.jpg`    |
| Mohammed Al-Khudair| Legal Advisor to the CEO & Director, Legal Research | `mohammed-al-khudair.jpg` |
| Saeed Suwailem     | Certified Expert                                 | `saeed-suwailem.jpg`       |

> "Data Link Company" (Platform Technical Operator) is a company, not a person —
> a photo is optional (use a logo if desired). Committee entries with no named
> person don't need one.
