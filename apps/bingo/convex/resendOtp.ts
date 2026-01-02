import { Email } from "@convex-dev/auth/providers/Email";
import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";

const resend = new Resend(components.resend, {
  testMode: false,
});

export const ResendOTP = Email({
  id: "resend-otp",
  maxAge: 60 * 15,
  async generateVerificationToken() {
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  },
  // @ts-expect-error @convex-dev/auth passes ctx as second arg but types don't reflect this
  async sendVerificationRequest({ identifier: email, token }, ctx) {
    await resend.sendEmail(ctx, {
      from: "DSQR <noreply@updates.dsqr.dev>",
      to: email,
      subject: "Sign in to Goals Bingo",
      text: `Your verification code is: ${token}\n\nThis code expires in 15 minutes.`,
    });
  },
});
