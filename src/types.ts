export const ALLOWED_VARIANTS = ["standard", "atomic", "atomic960"] as const;

export type TVariant = typeof ALLOWED_VARIANTS[number];

export const ALLOWED_INITIAL_TIMES = [
  30, 60, 120, 180, 300, 600, 1200, 1800, 3600,
] as const;

export type TInitialTime = typeof ALLOWED_INITIAL_TIMES[number];

export const ALLOWED_INCREMENTS = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 45, 60, 120, 180,
] as const;

export type TIncrement = typeof ALLOWED_INCREMENTS[number];

export const ALLOWED_ROUNDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100,
] as const;

export type TRounds = typeof ALLOWED_ROUNDS[number];

export const VARIANT_DISPLAYS: { [variant: string]: string } = {
  standard: "Standard",
  atomic: "Atomic",
  atomic960: "Atomic 960",
};

export class Variant {
  variant: TVariant = "standard";

  constructor(variant?: TVariant) {
    if (variant) this.variant = variant;
  }

  display() {
    return VARIANT_DISPLAYS[this.variant];
  }

  serialize() {
    return {
      variant: this.variant,
    };
  }

  deserialize(blob: any) {
    this.variant = blob.variant;

    return this;
  }
}
