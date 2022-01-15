import { UUID } from "bson";
import {
  Variant,
  TInitialTime,
  TIncrement,
  TRounds,
  uid,
  Serializeable,
  MongoStorable,
} from "./index";
import { TVariant } from "./types";

export class Seek implements Serializeable<Seek>, MongoStorable {
  variant: Variant = new Variant();
  initialTime: TInitialTime = 180;
  increment: TIncrement = 0;
  rated: boolean = true;
  rounds: TRounds = 1;
  createdBy: string = "?";
  id: string = uid();

  setVariant(variant: TVariant) {
    this.variant = new Variant(variant);
    return this;
  }

  serialize() {
    return {
      variant: this.variant.serialize(),
      initialTime: this.initialTime,
      increment: this.increment,
      rated: this.rated,
      rounds: this.rounds,
      createdBy: this.createdBy,
      id: this.id,
    };
  }

  deserialize(blob: any) {
    if (!blob) return this;

    this.variant = new Variant().deserialize(blob.variant);
    this.initialTime = blob.initialTime;
    this.increment = blob.increment;
    this.rated = blob.rated;
    this.rounds = blob.rounds;
    this.createdBy = blob.createdBy;
    this.id = blob.id;

    return this;
  }
}
