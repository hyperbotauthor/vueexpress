<template>
  <div style="text-align: center">
    Randusers |
    <button v-on:click="gennew">Generate new</button> |
    <a href="/">Home</a>
    <hr />
    <div class="name" v-for="name in randusers" :key="name">
      {{ name }}
    </div>
  </div>
</template>

<script>
import { Options, Vue } from "vue-class-component";

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
  data() {
    return {
      randusers: [],
    };
  },
  methods: {
    gennew() {
      post("/api/randusers").then((randusers) => (this.randusers = randusers));
    },
  },
  mounted() {
    this.gennew();
  },
})
export default class Randusers extends Vue {}
</script>

<style>
.name {
  display: inline-block;
  padding: 5px;
  margin: 3px;
  padding-right: 20px;
  padding-left: 20px;
  font-size: 20px;
  background-color: #ffa;
  font-family: monospace;
  font-weight: bold;
  color: #070;
  border: solid 1px;
  border-radius: 5px;
}
</style>
