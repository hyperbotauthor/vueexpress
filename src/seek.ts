import { Variant, TInitialTime, TIncrement, TRounds } from "./index";

export class Seek {
  variant: Variant = new Variant();
  initialTime: TInitialTime = 180;
  increment: TIncrement = 0;
  rated: boolean = true;
  rounds: TRounds = 1;
}
