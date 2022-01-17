import { toHandlers } from "vue";

var fs = {
  readFileSync: (path: string) => `${localStorage.getItem(path)}`,
  writeFileSync: (path: string, content: string) =>
    console.log("created file", path),
  appendFileSync: (path: string, content: string) =>
    console.log("appended", path, content),
};

var path = {
  join: function (...segments: string[]) {
    return segments.join("/");
  },
};

var __dirname__ = "";

var processEnv: { [key: string]: string } = {};

export class fileLogger {
  path: string;
  inited: boolean = false;
  constructor(path: string) {
    this.path = path;
  }

  log(...content: any) {
    if (!this.inited) {
      fs.writeFileSync(
        this.path,
        "init << " + this.path + " >> " + new Date().toLocaleString() + "\n"
      );

      this.inited = true;
    }

    content = content.map((item: any) => {
      if (typeof item === "object") {
        return JSON.stringify(item, null, 2);
      }
      return `${item}`;
    });

    fs.appendFileSync(
      this.path,
      new Date().toLocaleString() + " : " + content.join(" ") + "\n"
    );
  }
}

const flog = new fileLogger("utils.log");

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const MONTH = 30 * DAY;
export const WEEK = 7 * DAY;
export const YEAR = 365 * DAY;

export function formatDuration(dur: number) {
  if (dur < SECOND) return `${dur} millisecond(s)`;
  if (dur < MINUTE) return `${Math.floor((dur / SECOND) * 10) / 10} second(s)`;
  if (dur < HOUR) return `${Math.floor((dur / MINUTE) * 10) / 10} minute(s)`;
  if (dur < DAY) return `${Math.floor((dur / HOUR) * 10) / 10} hour(s)`;
  if (dur < WEEK) return `${Math.floor((dur / DAY) * 10) / 10} day(s)`;
  if (dur < MONTH) return `${Math.floor((dur / WEEK) * 10) / 10} week(s)`;
  if (dur < YEAR) return `${Math.floor((dur / MONTH) * 10) / 10} month(s)`;
  return `${Math.floor((dur / YEAR) * 10) / 10} year(s)`;
}

export class TimeQuotaItem {
  dur: number = 10000;
  freq: number = 1;
  constructor(dur?: number, freq?: number) {
    this.fromBlob({ dur, freq });
  }
  fromBlob(blob?: any) {
    if (!blob) return this;
    if (blob.dur !== undefined) this.dur = blob.dur;
    if (blob.freq !== undefined) this.freq = blob.freq;
    return this;
  }
  toString() {
    return `at most ${this.freq} in ${formatDuration(this.dur)}`;
  }
  exceeded(docs: any[], createdAtKeyOpt?: string, nowOpt?: number) {
    const createdAtKey = createdAtKeyOpt || "createdAt";
    const now = nowOpt || Date.now();

    let cnt = 0;

    for (const doc of docs) {
      const createdAt = doc[createdAtKey];
      if (typeof createdAt === "number") {
        const age = now - createdAt;
        if (age < this.dur) {
          cnt++;
        }
        if (cnt >= this.freq) return true;
      }
    }

    return false;
  }
}

export class TimeQuota {
  name: string = "Items";
  items: TimeQuotaItem[] = [new TimeQuotaItem()];
  filter: any = (doc: any) => true;
  constructor(name?: string, items?: TimeQuotaItem[]) {
    this.fromBlob({ name, items });
  }
  fromBlob(blob: any) {
    if (!blob) return this;
    if (blob.name !== undefined) this.name = blob.name;
    if (blob.items !== undefined)
      this.items = blob.items.map((itemBlob: any) =>
        new TimeQuotaItem().fromBlob(itemBlob)
      );
    return this;
  }
  toString() {
    return `${this.name} Quota [ ${this.items
      .map((item) => item.toString())
      .join(" , ")} ]`;
  }
  exceeded(
    docs: any[],
    filterOpt?: (doc: any) => boolean,
    createdAtKeyOpt?: string,
    nowOpt?: number
  ) {
    const createdAtKey = createdAtKeyOpt || "createdAt";
    const now = nowOpt || Date.now();

    for (const item of this.items) {
      if (
        item.exceeded(
          docs.filter(filterOpt || ((doc: any) => true)),
          createdAtKey,
          now
        )
      ) {
        return `${this.name} quota violated ${item}`;
      }
    }

    return undefined;
  }
}

export function setNode(
  setFs: any,
  setPath: any,
  setDirname: any,
  setProcessEnv: any
) {
  fs = setFs;
  path = setPath;
  __dirname__ = setDirname;
  processEnv = setProcessEnv;
}

export function readWords(name: string) {
  const raw = fs
    .readFileSync(path.join(__dirname__, "wordlists", `${name}.txt`))
    .toString()
    .replace(new RegExp("\r+", "g"), "\n")
    .replace(new RegExp("\n+", "g"), "\n");

  const words = raw.split("\n");

  return words;
}

export function chooseRandomWord(list: string[], capitalize: boolean) {
  const randomIndex = Math.floor(Math.random() * list.length);

  let word = list[randomIndex];

  if (capitalize) {
    word = word.substring(0, 1).toUpperCase() + word.substring(1);
  }

  return word;
}

const wordListNames = ["adverbs", "adjectives", "nouns"];

export function randUserNameFunc(limit: number) {
  const buckets = wordListNames.map((name) => readWords(name));

  const words = buckets.map((bucket) => chooseRandomWord(bucket, true));

  const num = Math.floor(Math.random() * 1000);

  const userName = `${words.join("")}${limit > 20 ? num : ""}`;

  return userName;
}

export function randUserName(limit: number) {
  do {
    const userName = randUserNameFunc(limit || 100);
    if (!limit) return userName;
    if (userName.length <= limit) return userName;
  } while (true);
}

export function envStrElse(key: string, def: string) {
  const env = processEnv[key];

  if (env === undefined) {
    return def;
  }

  return env;
}

export function envIntElse(key: string, def: number) {
  const defStr = `${def}`;

  const parsed = parseInt(envStrElse(key, defStr));

  if (isNaN(parsed)) {
    return def;
  }

  return parsed;
}

export function envBlobElse(key: string, def: any) {
  const json = envStrElse(key, "");
  try {
    return JSON.parse(json);
  } catch (err) {
    return def;
  }
}

export function uid() {
  return (
    "uid_" + Date.now().toString(36) + Math.random().toString(36).substring(2)
  );
}
