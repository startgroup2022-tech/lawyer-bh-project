import {randomBytes,scrypt,timingSafeEqual} from 'node:crypto';

const prefix='scrypt-32768-8-3';
function derive(password:string,salt:string):Promise<Buffer> {
  return new Promise((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
}
export async function hashPassword(password:string) {
  const salt=randomBytes(16).toString('hex');
  return `${prefix}$${salt}$${(await derive(password,salt)).toString('hex')}`;
}
export async function verifyPassword(password:string,hash:string|null) {
  const match=/^scrypt-32768-8-3\$([0-9a-f]{32})\$([0-9a-f]{128})$/.exec(hash??'');
  // Missing/legacy accounts incur the same derivation cost; never short-circuit.
  const key=await derive(password,match?.[1]??'0'.repeat(32));
  const expected=Buffer.from(match?.[2]??'0'.repeat(128),'hex');
  return timingSafeEqual(key,expected) && match!==null;
}
