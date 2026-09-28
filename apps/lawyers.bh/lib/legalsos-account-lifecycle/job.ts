import type postgres from 'postgres';
import type {PurgeResult} from './cron';
export function createMonitoredPurgeJob(sql:postgres.Sql,worker:(limit:number)=>Promise<PurgeResult>){
  return async():Promise<PurgeResult>=>{
    const [run]=await sql`INSERT INTO legalsos_purge_runs DEFAULT VALUES RETURNING id`;
    try{
      const result=await worker(25);
      await sql.begin(async tx=>{
        await tx`INSERT INTO legalsos_deletion_alerts(lifecycle_id,kind)
          SELECT id,CASE WHEN purge_after<=now() THEN 'overdue'
            WHEN purge_after<=now()+interval '24 hours' THEN 'one_day' ELSE 'seven_days' END
          FROM legalsos_account_lifecycle WHERE state<>'purged' AND purge_after<=now()+interval '168 hours'
          ON CONFLICT(lifecycle_id,kind) DO NOTHING`;
        await tx`UPDATE legalsos_purge_runs SET state=${result.failed?'failed':'completed'},
          processed=${result.processed},failed=${result.failed},finished_at=clock_timestamp() WHERE id=${run.id}`;
      });
      return result;
    }catch{
      await sql`UPDATE legalsos_purge_runs SET state='failed',finished_at=clock_timestamp() WHERE id=${run.id}`;
      throw new Error('purge_job_failed');
    }
  };
}
