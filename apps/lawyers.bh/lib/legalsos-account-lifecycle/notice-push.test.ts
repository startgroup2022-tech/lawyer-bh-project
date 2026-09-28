import {describe,it,expect} from 'vitest';
import {createDeletionPushDelivery} from './notice-push';
describe('deletion follow-up transport',()=>{
  it.each(['client','lawyer'] as const)('routes only to the %s with its selected locale',async recipientRole=>{
    const deliveries:unknown[]=[];
    const sender={sendClientPush:async(event:unknown)=>{deliveries.push({role:'client',event});return {sent:1,failed:0,pruned:0};},
      sendLawyerPush:async(event:unknown)=>{deliveries.push({role:'lawyer',event});return {sent:1,failed:0,pruned:0};}};
    await createDeletionPushDelivery(sender)({requestId:'request',recipientRole,lawyerId:recipientRole==='lawyer'?'lawyer':null,locale:'en'});
    expect(deliveries).toEqual([{role:recipientRole,event:{eventType:'account_closure_followup',requestId:'request',locale:'en',...(recipientRole==='lawyer'?{lawyerId:'lawyer'}:{})}}]);
  });
  it('keeps transient failures retryable, but allows pruned tokens to finish via the inbox',async()=>{
    for(const pruned of [0,1]){
      const send=async()=>({sent:0,failed:1,pruned});
      const task=createDeletionPushDelivery({sendClientPush:send,sendLawyerPush:send})({requestId:'request',recipientRole:'client',lawyerId:null,locale:'ar'});
      if(pruned===0)await expect(task).rejects.toThrow('notice_delivery_failed');else await expect(task).resolves.toBeUndefined();
    }
  });
});
