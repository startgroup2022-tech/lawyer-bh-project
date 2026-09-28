import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import postgres from 'postgres';
import {beforeAll,beforeEach,afterAll,describe,expect,it} from 'vitest';
import {createClientAuthService} from './store';
import {hashPassword} from './password';

const url=process.env.CLIENT_AUTH_TEST_DATABASE_URL;
// Real scrypt derivations can exceed the unit-test default on a busy build host.
// Keep the bounded integration budget long enough for the transaction to finish
// before the next test's TRUNCATE; do not replace password hashing with a stub.
describe.skipIf(!url)('client account transactions (isolated PostgreSQL)',{timeout:30_000},()=>{
  if (url && (!new URL(url).pathname.endsWith('/client_auth_test') || new URL(url).hostname!=='localhost')) throw new Error('Use the dedicated local client_auth_test database only');
  const schemaName=`auth_test_${randomUUID().replaceAll('-','')}`;
  const socket=url?new URL(url).searchParams.get('host'):null;
  if(socket && !socket.startsWith('/private/tmp/country-migration.')) throw new Error('Unexpected test socket');
  const connectionUrl=new URL(url ?? 'postgres://localhost/client_auth_test');
  connectionUrl.searchParams.delete('host');
  const sql=postgres(connectionUrl.toString(),{host:socket??'localhost',connection:{search_path:schemaName}});
  const emails:Array<{email:string;code:string;locale:string}>=[];
  const service=createClientAuthService(sql,'test-secret-'.repeat(4),async message=>{emails.push(message);});
  const signup={mode:'register' as const,password:'a long passphrase',email:'client@example.com',fullName:'Test Client',phone:'+97336000000',locale:'ar' as const};
  beforeAll(async()=>{await sql.unsafe(`CREATE SCHEMA ${schemaName}`);await sql.unsafe(await fs.readFile('drizzle/0047_mobile_client_accounts.sql','utf8'));await sql.unsafe(await fs.readFile('drizzle/0048_mobile_client_passwords.sql','utf8'));await sql.unsafe(await fs.readFile('drizzle/0051_mobile_client_account_changes.sql','utf8'));await sql.unsafe(await fs.readFile('drizzle/0091_legalsos_account_lifecycle.sql','utf8'));});
  beforeEach(async()=>{await sql`TRUNCATE mobile_client_auth_limits, mobile_client_challenges, mobile_client_sessions, mobile_client_accounts CASCADE`;emails.length=0;});
  afterAll(async()=>{try {await sql.unsafe(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);} finally {await sql.end();}});
  it('creates only after delivery and verification, consumes once, restores and revokes',async()=>{
    const challenge=await service.request(signup,'ip-1');
    expect((await sql`SELECT id FROM mobile_client_accounts`).length).toBe(0);
    const session=await service.verify(challenge.challengeId,emails[0].code,'ip-1');
    expect(session.client.fullName).toBe('Test Client');
    expect((await service.session(session.token))?.email).toBe('client@example.com');
    await expect(service.verify(challenge.challengeId,emails[0].code,'ip-1')).rejects.toMatchObject({code:'invalid_code'});
    await service.logout(session.token);
    expect(await service.session(session.token)).toBeNull();
  });
  it('locks after five wrong codes and rejects expiry',async()=>{
    const challenge=await service.request(signup,'ip-1');
    const wrong=emails[0].code==='000000'?'111111':'000000';
    for(let i=0;i<5;i++) await expect(service.verify(challenge.challengeId,wrong,'ip-1')).rejects.toMatchObject({code:'invalid_code'});
    await expect(service.verify(challenge.challengeId,emails[0].code,'ip-1')).rejects.toMatchObject({code:'invalid_code'});
    expect((await sql`SELECT attempts FROM mobile_client_challenges`)[0].attempts).toBe(5);
    await sql`UPDATE mobile_client_challenges SET attempts=0,expires_at=now()-interval '1 second'`;
    await expect(service.verify(challenge.challengeId,emails[0].code,'ip-1')).rejects.toMatchObject({code:'invalid_code'});
  });
  it('rate limits resends and preserves an existing profile',async()=>{
    const first=await service.request(signup,'ip-1');
    await service.verify(first.challengeId,emails[0].code,'ip-1');
    await expect(service.request(signup,'ip-1')).rejects.toMatchObject({code:'rate_limited'});
    await sql`UPDATE mobile_client_auth_limits SET last_at=now()-interval '2 minutes'`;
    const second=await service.request({...signup,fullName:'Do not overwrite',phone:'+973399999999'},'ip-1');
    await expect(service.verify(second.challengeId,emails[1].code,'ip-1')).rejects.toMatchObject({code:'account_exists'});
    const [result]=await sql`SELECT full_name,phone FROM mobile_client_accounts`;
    expect(result.full_name).toBe('Test Client');
    expect(result.phone).toBe('+97336000000');
  });
  it('password login and email recovery revoke older sessions without changing profile',async()=>{
    const challenge=await service.request(signup,'ip-1');
    const initial=await service.verify(challenge.challengeId,emails[0].code,'ip-1');
    await expect(service.login(signup.email,'wrong password','ip-1')).rejects.toMatchObject({code:'invalid_credentials'});
    const login=await service.login(signup.email,signup.password,'ip-1');
    expect(login.client.id).toBe(initial.client.id);
    await sql`UPDATE mobile_client_auth_limits SET last_at=now()-interval '2 minutes'`;
    const reset=await service.request({...signup,mode:'reset',password:'new secure passphrase',fullName:null,phone:null},'ip-1');
    expect(await service.session(initial.token)).not.toBeNull();
    const updated=await service.verify(reset.challengeId,emails[1].code,'ip-1');
    expect(await service.session(initial.token)).toBeNull();
    expect(await service.session(login.token)).toBeNull();
    expect(updated.client.fullName).toBe('Test Client');
    await expect(service.login(signup.email,signup.password,'ip-1')).rejects.toMatchObject({code:'invalid_credentials'});
    expect((await service.login(signup.email,'new secure passphrase','ip-1')).client.id).toBe(initial.client.id);
    const [stored]=await sql`SELECT password_hash FROM mobile_client_accounts`;
    expect(stored.password_hash).toMatch(/^scrypt-/);
    expect(stored.password_hash).not.toContain('new secure passphrase');
    expect((await sql`SELECT password_hash FROM mobile_client_challenges`)[0].password_hash).toBeNull();
  });
  it('recovery cannot create an account and passwordless legacy challenges cannot log in',async()=>{
    const challenge=await service.request({...signup,mode:'reset',fullName:null,phone:null},'ip-1');
    await expect(service.verify(challenge.challengeId,emails[0].code,'ip-1')).rejects.toMatchObject({code:'account_required'});
    expect(await sql`SELECT id FROM mobile_client_accounts`).toHaveLength(0);
    await sql`UPDATE mobile_client_challenges SET purpose='legacy',consumed=false`;
    await expect(service.verify(challenge.challengeId,emails[0].code,'ip-1')).rejects.toMatchObject({code:'invalid_code'});
  });
  it('allows only one concurrent verification and rejects expired sessions',async()=>{
    const challenge=await service.request(signup,'ip-1');
    const results=await Promise.allSettled([
      service.verify(challenge.challengeId,emails[0].code,'ip-1'),
      service.verify(challenge.challengeId,emails[0].code,'ip-2'),
    ]);
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
    expect((await sql`SELECT token_digest FROM mobile_client_sessions`)).toHaveLength(1);
    const success=results.find(result=>result.status==='fulfilled');
    if(!success || success.status!=='fulfilled') throw new Error('Expected a session');
    await sql`UPDATE mobile_client_sessions SET expires_at=now()-interval '1 second'`;
    expect(await service.session(success.value.token)).toBeNull();
  });
  it('limits password guessing and treats unknown and disabled accounts alike',async()=>{
    const challenge=await service.request(signup,'ip-1');
    await service.verify(challenge.challengeId,emails[0].code,'ip-1');
    await sql`UPDATE mobile_client_accounts SET is_active=false`;
    await expect(service.login(signup.email,signup.password,'ip-1')).rejects.toMatchObject({code:'invalid_credentials'});
    await expect(service.login('missing@example.com',signup.password,'ip-1')).rejects.toMatchObject({code:'invalid_credentials'});
    await sql`UPDATE mobile_client_accounts SET is_active=true`;
    for(let i=0;i<9;i++) await expect(service.login(signup.email,'wrong password','ip-1')).rejects.toMatchObject({code:'invalid_credentials'});
    await expect(service.login(signup.email,signup.password,'ip-2')).rejects.toMatchObject({code:'rate_limited'});
  },15000);
  it('allows existing passwordless accounts to recover only after email verification',async()=>{
    await sql`INSERT INTO mobile_client_accounts(email,full_name,phone) VALUES (${signup.email},'Original Client',${signup.phone})`;
    await expect(service.login(signup.email,signup.password,'ip-1')).rejects.toMatchObject({code:'invalid_credentials'});
    const reset=await service.request({...signup,mode:'reset',fullName:null,phone:null},'ip-1');
    const wrong=emails[0].code==='000000'?'111111':'000000';
    await expect(service.verify(reset.challengeId,wrong,'ip-1')).rejects.toMatchObject({code:'invalid_code'});
    expect((await sql`SELECT password_hash FROM mobile_client_accounts`)[0].password_hash).toBeNull();
    await service.verify(reset.challengeId,emails[0].code,'ip-1');
    expect((await service.login(signup.email,signup.password,'ip-1')).client.fullName).toBe('Original Client');
  });
  it('failed mail delivery cannot authenticate or create an account',async()=>{
    let code='';
    const broken=createClientAuthService(sql,'test-secret-'.repeat(4),async message=>{code=message.code;throw new Error('mail offline');});
    await expect(broken.request(signup,'ip-1')).rejects.toMatchObject({code:'delivery_failed'});
    const [challenge]=await sql`SELECT id,delivered FROM mobile_client_challenges`;
    expect(challenge.delivered).toBe(false);
    await expect(broken.verify(challenge.id,code,'ip-1')).rejects.toMatchObject({code:'invalid_code'});
    expect((await sql`SELECT id FROM mobile_client_accounts`).length).toBe(0);
  });
  it('updates only the authenticated client personal information',async()=>{
    const challenge=await service.request(signup,'ip-1');
    const session=await service.verify(challenge.challengeId,emails[0].code,'ip-1');
    const updated=await service.updatePersonalInfo(session.token,{fullName:'Updated Client',phone:'+97339999999'});
    expect(updated).toMatchObject({id:session.client.id,fullName:'Updated Client',phone:'+97339999999'});
    expect(await service.session(session.token)).toEqual(updated);
    await expect(service.updatePersonalInfo('0'.repeat(64),{fullName:'Intruder',phone:'+97338888888'})).rejects.toMatchObject({code:'unauthorized'});
  });
  it('hard deletes account and clears active session/challenge state',async()=>{
    const challenge=await service.request(signup,'ip-1');
    const session=await service.verify(challenge.challengeId,emails[0].code,'ip-1');
    await service.requestEmailChange(session.token,{email:'new@example.com',currentPassword:signup.password,locale:'en'},'ip-1');
    expect((await sql`SELECT token_digest FROM mobile_client_sessions`)).toHaveLength(1);
    expect((await sql`SELECT id FROM mobile_client_challenges`)).toHaveLength(2);
    await service.deleteAccount(session.token);
    expect((await service.session(session.token))).toBeNull();
    expect((await sql`SELECT * FROM mobile_client_accounts`)).toHaveLength(0);
    expect((await sql`SELECT * FROM mobile_client_sessions`)).toHaveLength(0);
    expect((await sql`SELECT * FROM mobile_client_challenges`)).toHaveLength(0);
  });
  it('changes email only after an owned delivered code and revokes other sessions',async()=>{
    const challenge=await service.request(signup,'ip-1');
    const current=await service.verify(challenge.challengeId,emails[0].code,'ip-1');
    const other=await service.login(signup.email,signup.password,'ip-2');
    const intruderPassword='another secure password';
    await sql`INSERT INTO mobile_client_accounts(email,full_name,phone,password_hash) VALUES ('intruder@example.com','Intruder','+97337777777',${await hashPassword(intruderPassword)})`;
    const intruder=await service.login('intruder@example.com',intruderPassword,'ip-3');
    await expect(service.requestEmailChange(current.token,{email:'new@example.com',currentPassword:'wrong password',locale:'en'},'ip-1')).rejects.toMatchObject({code:'invalid_credentials'});
    const requested=await service.requestEmailChange(current.token,{email:'new@example.com',currentPassword:signup.password,locale:'en'},'ip-1');
    expect(emails.at(-1)).toMatchObject({email:'new@example.com',locale:'en',purpose:'email_change'});
    const wrong=emails.at(-1)!.code==='000000'?'111111':'000000';
    await expect(service.verifyEmailChange(intruder.token,requested.challengeId,emails.at(-1)!.code,'ip-3')).rejects.toMatchObject({code:'invalid_code'});
    await expect(service.verifyEmailChange(current.token,requested.challengeId,wrong,'ip-1')).rejects.toMatchObject({code:'invalid_code'});
    const updated=await service.verifyEmailChange(current.token,requested.challengeId,emails.at(-1)!.code,'ip-1');
    expect(updated.email).toBe('new@example.com');
    expect((await service.session(current.token))?.email).toBe('new@example.com');
    expect(await service.session(other.token)).toBeNull();
    await expect(service.verifyEmailChange(current.token,requested.challengeId,emails.at(-1)!.code,'ip-1')).rejects.toMatchObject({code:'invalid_code'});
  });
  it('changes password after current-password verification and revokes other sessions',async()=>{
    const challenge=await service.request(signup,'ip-1');
    const current=await service.verify(challenge.challengeId,emails[0].code,'ip-1');
    const other=await service.login(signup.email,signup.password,'ip-2');
    await expect(service.changePassword(current.token,{currentPassword:'wrong password',newPassword:'new secure password'},'ip-1')).rejects.toMatchObject({code:'invalid_credentials'});
    await service.changePassword(current.token,{currentPassword:signup.password,newPassword:'new secure password'},'ip-1');
    expect(await service.session(current.token)).not.toBeNull();
    expect(await service.session(other.token)).toBeNull();
    await expect(service.login(signup.email,signup.password,'ip-3')).rejects.toMatchObject({code:'invalid_credentials'});
    expect((await service.login(signup.email,'new secure password','ip-4')).client.id).toBe(current.client.id);
  });
});
