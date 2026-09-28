import {NextResponse} from 'next/server';
import {and,eq} from 'drizzle-orm';
import {db,schema,sqlClient} from '@/lib/db/client';
import {requireAdvocateRequest} from '@/lib/sos/lawyerAuth';
import {nextServiceStatus} from '@/lib/sos/service-progress';

export async function POST(req:Request,{params}:{params:Promise<{caseRef:string}>}) {
  const auth=await requireAdvocateRequest(req);
  if(!auth.ok)return NextResponse.json({error:'unauthenticated'},{status:401});
  const {caseRef}=await params;
  const [row]=await db.select().from(schema.emergencyRequests).where(and(
    eq(schema.emergencyRequests.caseRef,caseRef),eq(schema.emergencyRequests.countryCode,auth.advocate.countryCode))).limit(1);
  if(!row)return NextResponse.json({error:'not_found'},{status:404});
  if(row.assignedLawyerId!==auth.advocate.id)return NextResponse.json({error:'not_your_case'},{status:403});
  const [type]=await sqlClient<{workflow_type:string}[]>`SELECT workflow_type FROM bahrain_emergency_case_types WHERE country_code=${auth.advocate.countryCode} AND (id::text=${row.mobilePaymentCaseId} OR (${row.mobilePaymentCaseId}::text IS NULL AND slug=${row.caseType})) LIMIT 1`;
  const status=nextServiceStatus(type?.workflow_type ?? 'emergency_dispatch',row.serviceStatus,'start');
  if(!status)return NextResponse.json({error:'invalid_transition',from:row.serviceStatus},{status:409});
  const [updated]=await db.update(schema.emergencyRequests).set({serviceStatus:status,updatedAt:new Date()}).where(and(
    eq(schema.emergencyRequests.id,row.id),eq(schema.emergencyRequests.assignedLawyerId,auth.advocate.id),
    eq(schema.emergencyRequests.serviceStatus,row.serviceStatus))).returning({id:schema.emergencyRequests.id});
  if(!updated)return NextResponse.json({error:'invalid_transition'},{status:409});
  return NextResponse.json({caseRef,status});
}
