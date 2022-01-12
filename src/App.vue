<template>
  <div>
    <div class="nav">
      <div class="reqcnt">Total Requests: <AppComponent /></div>

      <div class="logincont">
        <div class="login">
          <button id="loginbutton">Login</button>
          <button id="logoutbutton">Logout</button>
          <div id="usernamediv"></div>
        </div>
      </div>
    </div>
    <div class="content">
      <a
        href="/api/board?fen=&moves=&arrows=&circles=&size=&player=&variant=&flip="
        >Board API</a
      >
    </div>
    <pre
      >{{ event }}
    </pre>
  </div>
</template>

<script>
import { Options, Vue } from "vue-class-component";
import { AppComponent } from "../dist/index.js";

@Options({
  components: {
    AppComponent,
  },
  data() {
    return {
      event: {},
    };
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

      if (data.kind !== "tick") {
        console.log("event", data);
      }

      // Display the event data in the `content` div
      this.event = data;
    };

    console.log(source);
  },
})
export default class App extends Vue {}
</script>

<style>
#app {
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
.content a {
  font-size: 20px;
}
</style>
