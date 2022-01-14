const fetch = require("node-fetch");
const fs = require("fs");

const pkg = require("./package.json");
const { getHeapSpaceStatistics } = require("v8");

const argv = require("minimist")(process.argv.slice(2));

const API_BASE_URL = "https://api.heroku.com";

let defaultTokenName = "HEROKU_TOKEN";
let defaultToken = process.env[defaultTokenName];

function api(endpoint, method, payload, token) {
  return new Promise((resolve, reject) => {
    fetch(`${API_BASE_URL}/${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${token || defaultToken}`,
        Accept: "application/vnd.heroku+json; version=3",
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
    }).then(
      (resp) =>
        resp.json().then(
          (json) => resolve(json),
          (err) => {
            console.error(err);
            reject(err);
          }
        ),
      (err) => {
        console.error(err);
        reject(err);
      }
    );
  });
}

function get(endpoint, payload, token) {
  return api(endpoint, "GET", payload, token);
}

function post(endpoint, payload, token) {
  return api(endpoint, "POST", payload, token);
}

function del(endpoint, payload, token) {
  return api(endpoint, "DELETE", payload, token);
}

function patch(endpoint, payload, token) {
  return api(endpoint, "PATCH", payload, token);
}

function getSchema() {
  get("schema").then((json) =>
    fs.writeFileSync("schema.json", JSON.stringify(json, null, 2))
  );
}

function createApp(name, token) {
  return new Promise((resolve) => {
    post("apps", { name }, token).then((json) => {
      if (require.main === module) {
        console.log(json);
      }

      resolve(json);
    });
  });
}

function delApp(name, token) {
  return new Promise((resolve) => {
    del(`apps/${name}`, undefined, token).then((json) => {
      if (require.main === module) {
        console.log(json);
      }

      resolve(json);
    });
  });
}

function setConfig(name, configVars, token) {
  patch(`apps/${name}/config-vars`, configVars, token).then((json) =>
    console.log(json)
  );
}

function getLogs(name, token, lines, tail) {
  return new Promise((resolve) => {
    post(
      `apps/${name}/log-sessions`,
      { lines: lines || 100, tail: tail || false },
      token
    ).then((json) => {
      if (require.main === module) {
        console.log(json);
      }

      resolve(json);
    });
  });
}

function getApps(token) {
  return new Promise((resolve) => {
    get("apps", undefined, token).then((json) => {
      if (require.main === module) {
        console.log(json);
      }
      const alltokens = getAllTokens();
      json.forEach((app) => {
        app.herokuToken = token;
        app.herokuName = alltokens.tokensByToken[token].split("_")[2];
      });
      resolve(json);
    });
  });
}

function getAllApps() {
  return new Promise((resolve) => {
    const alltokens = getAllTokens();

    Promise.all(
      Object.keys(alltokens.tokensByToken).map((token) => getApps(token))
    ).then((appss) => {
      const apps = appss.flat().map((app) => {
        app.herokuIndex = Object.keys(alltokens.tokensByToken).findIndex(
          (token) => app.herokuToken === token
        );
        return app;
      });

      if (require.main === module) {
        console.log(apps);
      }

      resolve(apps);
    });
  });
}

function buildApp(name, url, token) {
  post(
    `apps/${name}/builds`,
    {
      source_blob: {
        checksum: null,
        url,
        version: null,
      },
    },
    token
  ).then((json) => console.log(json));
}

function getAllTokens() {
  const tokensByName = {};
  const tokensByToken = {};
  const namesByName = {};
  Object.keys(process.env)
    .filter((key) => key.match(new RegExp("^HEROKU_TOKEN_")))
    .forEach((token) => {
      const envToken = process.env[token];
      tokensByName[token] = envToken;
      tokensByToken[envToken] = token;
      namesByName[token] = token.split("_")[2];
    });
  return {
    tokensByName,
    tokensByToken,
    namesByName,
  };
}

if (require.main !== module) {
  module.exports = {
    getApps,
    getAllTokens,
    getAllApps,
    createApp,
    delApp,
    getLogs,
  };
} else {
  console.log("heroku command");

  const heroku = pkg.heroku;
  const command = argv._[0];
  delete argv._;

  const appName = argv.name || heroku.appname;
  const targzurl = argv.url || pkg.targzurl;
  const config = {};
  pkg.heroku.configvars.forEach((cv) => (config[cv] = process.env[cv] || null));

  if (argv.token) {
    defaultTokenName = defaultTokenName + "_" + argv.token.toUpperCase();
    defaultToken = process.env[defaultTokenName];
  }

  console.log(command, argv, defaultTokenName);

  if (command === "create") {
    createApp(appName);
  } else if (command === "del") {
    delApp(appName);
  } else if (command === "build") {
    buildApp(appName, targzurl);
  } else if (command === "schema") {
    getSchema();
  } else if (command === "setconfig") {
    console.log(config);
    setConfig(appName, config);
  } else if (command === "getapps") {
    getApps();
  } else if (command === "getallapps") {
    getAllApps();
  } else if (command === "gettokens") {
    console.log(getAllTokens());
  } else if (command === "getlogs") {
    getLogs(appName);
  } else {
    console.error("unknown command");
  }
}