import type { PaymentChannel } from "../../domain/entities/LedgerEntry.ts";
import { PaymentProvider, type PaymentReceipt, type PaymentRequest } from "./PaymentProvider.ts";

abstract class DemoPaymentProvider extends PaymentProvider {
  public async collectPayment(request: PaymentRequest): Promise<PaymentReceipt> {
    if (!Number.isSafeInteger(request.amountTzs) || request.amountTzs <= 0) throw new Error("Amount must be a positive whole TZS value.");
    if (!request.reference.trim()) throw new Error("Payment reference is required.");
    return { ...request, providerReference: request.reference.trim(), channel: this.channel, verified: true, occurredAt: new Date() };
  }
}

export class MpesaProvider extends DemoPaymentProvider { public readonly channel: PaymentChannel = "mpesa"; }
export class AirtelMoneyProvider extends DemoPaymentProvider { public readonly channel: PaymentChannel = "airtel_money"; }
export class HaloPesaProvider extends DemoPaymentProvider { public readonly channel: PaymentChannel = "halopesa"; }
export class YasProvider extends DemoPaymentProvider { public readonly channel: PaymentChannel = "yas"; }
export class CashVoucherProvider extends DemoPaymentProvider { public readonly channel: PaymentChannel = "cash_voucher"; }
