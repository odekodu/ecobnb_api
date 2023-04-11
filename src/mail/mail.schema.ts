import { MailTemplateEnum } from "./mail-template.enum";

export interface MailSchema {
  to: string,
  context?: any,
  subject: string,
  template: MailTemplateEnum
}