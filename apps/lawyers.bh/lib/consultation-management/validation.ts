import type { ConsultationTypeInput } from "./types";
import { isConsultationIconKey } from "@/lib/consultation-icons/catalog";

function field(value: unknown, error: string, max: number) { const result=String(value??"").trim(); if(!result||result.length>max) throw new Error(error); return result; }
function code(value: unknown) { const result=field(value,"invalid_code",32).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new Error("invalid_code"); return result; }

export function parseConsultationTypeInput(value: unknown,{includeCode}:{includeCode:boolean}):ConsultationTypeInput {
 const body=(value&&typeof value==="object"?value:{}) as Record<string,unknown>;
 if(!includeCode&&body.code!==undefined) throw new Error("immutable_code");
 const price=String(body.price??"").trim(); if(!/^\d{1,7}(?:\.\d{1,3})?$/.test(price)||Number(price)<=0) throw new Error("invalid_price");
 const durationMinutes=Number(body.durationMinutes); if(!Number.isInteger(durationMinutes)||durationMinutes<=0||durationMinutes>1440) throw new Error("invalid_duration");
 const currencyCode=String(body.currencyCode??"").trim().toUpperCase(); if(!/^[A-Z]{3}$/.test(currencyCode)) throw new Error("invalid_currency");
 const iconKey=field(body.iconKey,"invalid_icon",64); if(!isConsultationIconKey(iconKey)) throw new Error("invalid_icon");
 return {...(includeCode?{code:code(body.code)}:{}),nameAr:field(body.nameAr,"invalid_name_ar",160),nameEn:field(body.nameEn,"invalid_name_en",160),price:Number(price).toFixed(3),currencyCode,durationMinutes,iconKey};
}

export function parseReorderInput(value:unknown){const ids=(value as {ids?:unknown})?.ids;if(!Array.isArray(ids)||ids.length<1||ids.some(id=>typeof id!=="string"||!id.trim())||new Set(ids).size!==ids.length)throw new Error("invalid_order");return ids.map(id=>String(id).trim());}
