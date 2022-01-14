import { api } from "./api";

export { api };

import AppComponent from "./components/HelloWorld.vue";

export { AppComponent };

import {
  Variant,
  ALLOWED_VARIANTS,
  TVariant,
  ALLOWED_INITIAL_TIMES,
  TInitialTime,
  ALLOWED_INCREMENTS,
  TIncrement,
  ALLOWED_ROUNDS,
  TRounds,
  VARIANT_DISPLAYS,
} from "./types";

export {
  Variant,
  ALLOWED_VARIANTS,
  TVariant,
  ALLOWED_INITIAL_TIMES,
  TInitialTime,
  ALLOWED_INCREMENTS,
  TIncrement,
  ALLOWED_ROUNDS,
  TRounds,
  VARIANT_DISPLAYS,
};

import { Seek } from "./seek";

export { Seek };

export function uid() {
  return (
    "uid_" + Date.now().toString(36) + Math.random().toString(36).substring(2)
  );
}
