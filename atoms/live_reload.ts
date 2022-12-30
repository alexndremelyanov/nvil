import { Atom } from "../atom.ts";
import { log } from "../deps.ts";

const callbacks = new Map<string, () => void>();

export function handleLiveReloadRequest(request: Request) {
  const { pathname } = new URL(request.url);
  if (pathname !== "/live-reload-events") {
    return;
  }
  const id = crypto.randomUUID();
  const body = new ReadableStream({
    start(controller) {
      callbacks.set(id, () => controller.enqueue(`data: null\n\n`));
    },
    cancel() {
      callbacks.delete(id);
    },
  });
  return new Response(body.pipeThrough(new TextEncoderStream()), {
    headers: { "Content-Type": "text/event-stream" },
  });
}

export function liveReload(): Atom {
  return ({ config: { dev }, bundle, on, run }) => {
    if (!dev) {
      return;
    }
    const key = "./live-reload.js";
    on("BOOTSTRAP", async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode(liveReloadScript);
      log.info("Populating live reload script");
      bundle.set(key, { data });
      await run("LIVE_RELOAD_INJECT");
    });
    on("BUILD_END", () => {
      if (!bundle.has(key)) {
        return;
      }
      log.info("Reloading");
      callbacks.forEach((fn) => fn());
    });
  };
}

const liveReloadScript = `
const eventSource = new EventSource("/live-reload-events");
eventSource.addEventListener("message", () => {
  location.reload();
});
`.trimStart();
