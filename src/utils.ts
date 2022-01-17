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

export function uid() {
  return (
    "uid_" + Date.now().toString(36) + Math.random().toString(36).substring(2)
  );
}

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
