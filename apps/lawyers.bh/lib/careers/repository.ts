import "server-only";
import { sqlClient } from "@/lib/db/client";
import { createCareersStore } from "./store";

export const careers = createCareersStore(sqlClient);
