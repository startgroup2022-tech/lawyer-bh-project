export type PurgeResult={processed:number;failed:number};
export type PurgeStatus={due:number;pending:number};
export function createPurgeCron(deps:{secret:()=>string|undefined;enabled:()=>boolean;run:()=>Promise<PurgeResult>;status:()=>Promise<PurgeStatus>}){
  return async(request:Request)=>{
    const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store'}});
    const secret=deps.secret(),header=request.headers.get('authorization');
    const expected=Buffer.from(secret??''),supplied=Buffer.from(header?.startsWith('Bearer ')?header.slice(7):'');
    if(!secret||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return reply({ok:false,error:'unauthorized'},401);
    try{
      if(new URL(request.url).searchParams.get('dryRun')==='1')return reply({ok:true,dryRun:true,enabled:deps.enabled(),...await deps.status()});
      if(!deps.enabled())return reply({ok:false,error:'purge_disabled'},503);
      const result=await deps.run();
      return reply({ok:result.failed===0,...result},result.failed?500:200);
    }catch{return reply({ok:false,error:'purge_failed'},500);}
  };
}
import {timingSafeEqual} from 'node:crypto';
