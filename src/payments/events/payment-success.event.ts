export class PaymentSuccessEvent {
  constructor(
    public readonly token: string,
    public readonly provider: string,
    public readonly url: string,
  ) {}
}
