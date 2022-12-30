import { Atom } from "../atom.ts";
import { server, log, path, fileServer } from "../deps.ts";
import { handleLiveReloadRequest } from "./live_reload.ts";

export function devServer(): Atom {
  return ({ config: { dev, destDir }, on }) => {
    if (!dev) {
      return;
    }
    on("BOOTSTRAP", () => {
      const indexHtml = path.join(destDir, "index.html");
      server.serve(
        (req) => {
          return (
            handleLiveReloadRequest(req) ||
            fileServer
              .serveDir(req, { fsRoot: destDir })
              .then((v) =>
                v.status === 404 ? fileServer.serveFile(req, indexHtml) : v
              )
          );
        },
        {
          onListen: ({ hostname, port }) => {
            log.info(`Started dev server on ${hostname}:${port}`);
          },
        }
      );
    });
  };
}
