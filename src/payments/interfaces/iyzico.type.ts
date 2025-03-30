export type IyzicoWebhookData = {
  paymentConversationId: string;
  merchantId: number;
  token: string;
  status: IyzicoStatusEnum;
  iyziReferenceCode: string;
  iyziEventType: IyziEventTypeEnum;
  iyziEventTime: number;
  iyziPaymentId: number;
};

export enum IyziEventTypeEnum {
  API_AUTH,
  THREE_DS_AUTH,
  BKM_AUTH,
}

export enum IyzicoStatusEnum {
  FAILURE = 'FAILURE',
  SUCCESS = 'SUCCESS',
}
