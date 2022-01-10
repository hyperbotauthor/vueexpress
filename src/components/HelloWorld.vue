<script lang="ts">
import { defineComponent, h, reactive, onMounted } from "vue";

export async function getReqCnt(react: any) {
  const resp = await fetch("api/reqcnt");
  const json = await resp.json();

  react.reqCnt = json.reqCnt;

  console.log(JSON.stringify(react));
}

export default defineComponent({
  name: "AppComponent",
  props: {
    reqCnt: {
      type: Number,
      default: 0,
    },
  },
  setup(props, context) {
    const react = reactive({
      reqCnt: 0,
    });

    onMounted(() => getReqCnt(react));

    const renderFunction = () => {
      return h("div", {}, [
        h("div", {}, props.reqCnt),
        h("div", {}, react.reqCnt),
      ]);
    };

    return renderFunction;
  },
});
</script>

<style></style>
