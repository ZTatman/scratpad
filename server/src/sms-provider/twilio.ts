import twilio, { Twilio } from 'twilio';

export type SendSmsInput = {
  to: string;
  body: string;
};

export class TwilioSmsProvider {
  private readonly client: Twilio;

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string
  ) {
    this.client = twilio(accountSid, authToken);
  }

  async sendMessage(input: SendSmsInput): Promise<string> {
    const message = await this.client.messages.create({
      from: this.fromNumber,
      to: input.to,
      body: input.body
    });
    return message.sid;
  }

  validateSignature(signature: string, url: string, params: Record<string, string>): boolean {
    return twilio.validateRequest(this.authToken, signature, url, params);
  }

  twimlMessage(message: string): string {
    return new twilio.twiml.MessagingResponse().message(message).toString();
  }
}
