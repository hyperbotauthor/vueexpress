<template>
  <div>
    <div class="nav">
      <div class="login">
        <button id="loginbutton">Login</button>
        <button id="logoutbutton">Logout</button>
        <div id="usernamediv"></div>
      </div>
    </div>
    <AppComponent />
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
    return {};
  },
  mounted() {},
})
export default class App extends Vue {}
</script>

<style>
#app {
  text-align: center;
}
.nav {
  padding: 5px;
  background-color: #eee;
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
}
button {
  margin: 2px;
}
</style>
