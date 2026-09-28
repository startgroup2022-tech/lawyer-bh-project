import { requireSarayaPrincipal } from "../auth/request";
import { sessions } from "../auth/runtime";
import { createPaymentHandlers } from "./http";
import { documentStorage } from "../documents/storage";
import { createPaymentProofUploader } from "./proof-upload";
import { verifyWebhookSignature } from "@/lib/tap";
import { requestIp } from "../auth/security";
import { paymentRepository } from "./repository";
import { createPaymentService } from "./service";
import { sarayaTapGateway } from "./tap-gateway";
import { leaseCheckoutService } from "../leases/checkout-runtime";

const service = createPaymentService(paymentRepository, sarayaTapGateway(), leaseCheckoutService);

export const paymentHandlers = createPaymentHandlers({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  createOnlineSession: service.createOnlineSession,
  readReturn: service.readReturn,
  confirmTapCharge: service.confirmTapCharge,
  submitOfflineProof: service.submitOfflineProof,
  decideOfflinePayment: service.decideOfflinePayment,
  uploadOfflineProof: createPaymentProofUploader(paymentRepository, documentStorage),
  verifyWebhook: verifyWebhookSignature,
  clientIp: requestIp,
});
