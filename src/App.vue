<template>
  <div>
    <div class="nav">
      <div class="reqcnt">Total Requests: <AppComponent /></div>

      <div class="logincont">
        <div class="login">
          <button id="loginbutton">Login</button>
          <button id="logoutbutton">Logout</button>
          <div id="usernamediv">{{ profile.username }}</div>
        </div>
      </div>
    </div>

    <div class="maincont">
      <div class="users">
        <div
          class="loggeduser"
          v-for="id in Object.keys(usersCache || {})"
          :key="`Math.random()`"
        >
          {{ usersCache[id].username }}
        </div>
      </div>

      <div class="main">
        <div class="content">
          <a
            href="/api/board?fen=&moves=&arrows=&circles=&size=&player=&variant=&flip="
            rel="noopener noreferror"
            target="_blank"
            >Board API</a
          >
          (
          <a
            href="https://lichess.org/@/hyperchessbotauthor/blog/board-image-api/j9TaGcbL"
            rel="noopener noreferror"
            target="_blank"
            >Board API Docs</a
          >
          )
        </div>
        <div class="chat">
          <input type="text" v-on:keyup="chatmsgentered" />
          <div class="message" v-for="msg in messages" :key="`Math.random()`">
            <div class="poster">{{ msg.profile.username || "@nonymous" }}</div>
            <div class="time">{{ new Date(msg.time).toLocaleString() }}</div>
            <div class="msg">{{ msg.msg }}</div>
          </div>
        </div>
        <pre
          >{{ event }}
        </pre>
      </div>
    </div>
  </div>
</template>

<script>
import { Options, Vue } from "vue-class-component";
import { AppComponent } from "../dist/index.js";

function post(endpoint, payloadOpt) {
  const payload = payloadOpt || {};
  return new Promise((resolve) => {
    payload.token = localStorage.getItem("LICHESS_TOKEN");
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).then((response) =>
      response.json().then((json) => {
        resolve(json);
      })
    );
  });
}

@Options({
  components: {
    AppComponent,
  },
  data() {
    return {
      event: {},
      messages: [],
      usersCache: {},
      profile: { username: "?" },
    };
  },
  methods: {
    chatmsgentered(ev) {
      if (ev.keyCode === 13) {
        const msg = ev.target.value;
        console.log("sending", msg);
        ev.target.value = "";
        post("/api/post", { msg });
      }
    },
    login() {
      post("/api/login").then((profile) => {
        console.log("login profile", profile);

        if (profile.setTokenToUserId) {
          console.log("setting token to user id");

          localStorage.setItem("LICHESS_TOKEN", profile.id);
        }

        this.profile = profile;

        this.usersCache[this.profile.id] = this.profile;
      });
    },
  },
  mounted() {
    const source = new EventSource("/api/events");

    source.onopen = () => {
      console.log("source opened");
    };

    source.onerror = () => {
      console.error("source failed");
    };

    source.onmessage = (ev) => {
      const data = JSON.parse(ev.data);

      if (data.kind === "tick") {
        this.usersCache = data.usersCache;
      } else {
        console.log("event", data);
      }

      if (data.kind === "chat") {
        this.messages = data.messages;

        if (data.usersCache) {
          this.usersCache = data.usersCache;
        }
      }

      if (data.kind === "users") {
        this.usersCache = data.usersCache;

        console.log(this.usersCache);
      }

      // Display the event data in the `content` div
      this.event = data;
    };

    console.log(source);

    this.login();

    setInterval(() => {
      this.login();
    }, 10000);
  },
})
export default class App extends Vue {}
</script>

<style>
#app {
}
.maincont {
  display: flex;
  width: 100%;
}
.main {
  width: 100%;
}
.users {
  min-width: 200px;
  max-width: 200px;
  overflow: hidden;
}
.nav {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 5px;
  background-color: #eee;
}
.logincont {
  display: inline-block;
  padding: 2px;
  background-color: #aff;
}
.login {
  display: flex;
  align-items: center;
}
#usernamediv {
  padding-left: 5px;
  padding-right: 5px;
  color: #007;
  font-family: monospace;
  background-color: #ffa;
  font-size: 16px;
  margin-left: 5px;
}
button {
  margin: 2px;
}
.content {
  margin-top: 5px;
  padding: 5px;
  background-color: #ffd;
}
.chat {
  margin-top: 5px;
  padding: 5px;
  background-color: #fdf;
}
.content a {
  font-size: 20px;
}
.message {
  padding: 5px;
  margin: 3px;
  background-color: #dff;
  font-weight: bold;
  color: #070;
}
.message .poster {
  display: inline-block;
  margin-right: 10px;
  font-family: monospace;
  color: #707;
  font-size: 18px;
}
.message .time {
  display: inline-block;
  margin-right: 10px;
  font-family: monospace;
  color: #007;
}
.message .msg {
  display: inline-block;
  padding: 3px;
  background-color: #ffa;
  font-family: Verdana;
}
.loggeduser {
  padding: 3px;
  background-color: #ffa;
  margin: 3px;
}
</style>
