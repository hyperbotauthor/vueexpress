const lichessHost = "https://lichess.org";
const clientId = "example.com";

const clientUrl = (() => {
  const url = new URL(location.href);
  url.search = "";
  return url.href;
})();

const oauth = new OAuth2AuthCodePKCE.OAuth2AuthCodePKCE({
  authorizationUrl: `${lichessHost}/oauth`,
  tokenUrl: `${lichessHost}/api/token`,
  clientId,
  scopes: [],
  redirectUrl: clientUrl,
  onAccessTokenExpiry: (refreshAccessToken) => refreshAccessToken(),
  onInvalidGrant: (_retry) => {},
});

async function login() {
  // Redirect to authentication prompt.
  await oauth.fetchAuthorizationCode();
}

async function useApi() {
  const res = await fetch(`${lichessHost}/api/account`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("LICHESS_TOKEN")}`,
    },
  });
  const username = (await res.json()).id;
  console.log(username);
  document.getElementById("usernamediv").innerHTML = username || "-";
}

function updateToken() {
  const token = localStorage.getItem("LICHESS_TOKEN");

  console.log("update token to", token);

  //document.getElementById("LICHESS_TOKEN").value = token

  const buttonElements = ["logoutbutton"].map((id) =>
    document.getElementById(id)
  );

  buttonElements.forEach((e) =>
    token ? e.removeAttribute("disabled") : e.setAttribute("disabled", true)
  );
}

let retries = 10;

async function init() {
  if (!document.getElementById("logoutbutton")) {
    console.log("oauth no ui detected, restarting");
    if (retries--) {
      setTimeout(init, 2000);
    } else {
      console.error("oauth init timed out");
    }
    return;
  } else {
    console.log("oauth ui ready");
    document.getElementById("loginbutton").addEventListener("click", login);
    document.getElementById("logoutbutton").addEventListener("click", logout);
  }

  updateToken();
  try {
    const hasAuthCode = await oauth.isReturningFromAuthServer();
    if (hasAuthCode) {
      const accessContext = await oauth.getAccessToken();

      console.log(accessContext);

      localStorage.setItem("LICHESS_TOKEN", accessContext.token.value);

      updateToken();

      document.location.href = "/";
    }
  } catch (err) {
    console.log(err);
  }
  useApi();
}

async function logout() {
  const token = localStorage.getItem("LICHESS_TOKEN");

  const response = await fetch(`${lichessHost}/api/token`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  console.log("logout status", response.status);

  const text = await response.text();

  console.log(text);

  localStorage.removeItem("LICHESS_TOKEN");

  document.location.href = "/";
}

init();
