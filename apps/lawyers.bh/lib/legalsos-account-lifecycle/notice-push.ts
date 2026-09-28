import type {createMobilePushSender} from '../sos/mobile-push';
import type {DeletionNotice} from './notices';
export function createDeletionPushDelivery(sender:ReturnType<typeof createMobilePushSender>){
  return async(notice:DeletionNotice):Promise<void>=>{
    const event={eventType:'account_closure_followup' as const,requestId:notice.requestId,locale:notice.locale};
    if(notice.recipientRole==='lawyer'&&!notice.lawyerId)throw new Error('notice_recipient_missing');
    const result=notice.recipientRole==='lawyer'
      ?await sender.sendLawyerPush({...event,lawyerId:notice.lawyerId!})
      :await sender.sendClientPush(event);
    if(result.failed>result.pruned)throw new Error('notice_delivery_failed');
  };
}
