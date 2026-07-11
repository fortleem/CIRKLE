import { describe, it, expect } from "vitest";
import { validate, aiAskSchema, sendPaymentSchema } from "@/lib/validation";
describe("Validation", () => {
  it("accepts valid message", () => { expect(validate(aiAskSchema, { message: "hello" }).success).toBe(true); });
  it("rejects empty message", () => { expect(validate(aiAskSchema, { message: "" }).success).toBe(false); });
  it("accepts valid payment", () => { expect(validate(sendPaymentSchema, { recipient: "Layla", amount: 50 }).success).toBe(true); });
  it("rejects negative amount", () => { expect(validate(sendPaymentSchema, { recipient: "Layla", amount: -50 }).success).toBe(false); });
});
