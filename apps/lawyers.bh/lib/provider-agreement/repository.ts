import "server-only";
import { sqlClient } from "@/lib/db/client";
import { createAgreementStore } from "./store";
import { createAgreementLibrary } from "./library-store";
import { createAgreementFiles } from "./builder-files";
export const agreements = createAgreementStore(sqlClient);
export const agreementLibrary = createAgreementLibrary(sqlClient);
export const agreementFiles = createAgreementFiles(sqlClient);
