const fs = require("fs");
const path = require("path");

function readWords(name) {
  console.log(__dirname);
  const raw = fs
    .readFileSync(path.join(__dirname, "wordlists", `${name}.txt`))
    .toString()
    .replace(new RegExp("\r+", "g"), "\n")
    .replace(new RegExp("\n+", "g"), "\n");

  const words = raw.split("\n");

  return words;
}

function chooseRandomWord(list, capitalize) {
  const randomIndex = Math.floor(Math.random() * list.length);

  let word = list[randomIndex];

  if (capitalize) {
    word = word.substring(0, 1).toUpperCase() + word.substring(1);
  }

  return word;
}

const wordListNames = ["adverbs", "adjectives", "nouns"];

function randUserNameFunc(limit) {
  const buckets = wordListNames.map((name) => readWords(name));

  const words = buckets.map((bucket) => chooseRandomWord(bucket, true));

  const num = Math.floor(Math.random() * 1000);

  const userName = `${words.join("")}${limit > 20 ? num : ""}`;

  return userName;
}

function randUserName(limit) {
  do {
    const userName = randUserNameFunc(limit || 100);
    //console.log(userName)
    if (!limit) return userName;
    if (userName.length <= limit) return userName;
  } while (true);
}

function uid() {
  return (
    "uid_" + Date.now().toString(36) + Math.random().toString(36).substring(2)
  );
}

module.exports = {
  randUserName,
  uid,
};
