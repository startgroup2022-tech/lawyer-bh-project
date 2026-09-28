import "server-only";
import { sqlClient } from "@/lib/db/client";
import { createTrainingStore } from "./store";
export const training = createTrainingStore(sqlClient);
