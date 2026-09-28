import {NextResponse} from "next/server";
import type {NextRequest} from "next/server";
import {getProviderSessionFromRequest} from "../_session";
import {getLawyerTermsRequirement} from "@/lib/terms-management/acceptance";
import {listTermsVersions} from "@/lib/terms-management/service";
export async function GET(request:NextRequest){const session=getProviderSessionFromRequest(request);if(!session)return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});const required=await getLawyerTermsRequirement(session.providerId);if(!required)return NextResponse.json({ok:true,required:false});const terms=(await listTermsVersions("lawyer_registration")).find(item=>item.id===required.versionId);if(!terms)return NextResponse.json({ok:false,error:"terms_version_not_found"},{status:404});return NextResponse.json({ok:true,required:true,terms})}
