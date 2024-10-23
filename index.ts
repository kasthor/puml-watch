#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net --allow-env
import { parse } from "jsr:@std/flags@0.224";
import { encode } from "npm:plantuml-encoder@1.4.0";

const { input, port } = parse(Deno.args, {
  string: ["input", "port"],
  default: { port: 8000 },
});

if (!input) {
  throw new Error("Missing required parameter: --input");
}

const portNumber = Number.isInteger(+port) ? +port : 8000;

const sockets = new Set<WebSocket>();

const plantUml2Svg = async (diagram: string) => {
  const url = `http://plantuml.com/plantuml/svg/${encode(diagram)}`;
  const response = await fetch(url);
  return response.text();
};

const generateDiagram = async () => {
  try {
    const diagram = await Deno.readTextFile(input);
    const rendered = await plantUml2Svg(diagram);
    for (const client of sockets) {
      client.send(rendered);
    }
  } catch (error) {
    console.error("Error reading input file:", error);
  }
};

const serveHttp = () => {
  return Deno.serve({
    port: portNumber,
    handler: async (request: Request) => {
      const url = new URL(request.url);
      switch (url.pathname) {
        case "/ws":
          const { socket, response } = Deno.upgradeWebSocket(request);
          socket.onopen = () => {
            sockets.add(socket);
            generateDiagram(); // Send diagram to new client
          };
          socket.onclose = () => {
            sockets.delete(socket);
          };
          return response;
        case "/":
          const html = `
            <!DOCTYPE html>
            <html lang="en">
              <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>PlantUML Preview</title>
                <style>
                  html, body {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                  }
                  body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }
                  #chart {
                    width: 95vw;
                    height: 95vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  }
                  #chart svg {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                  }
                </style>
                <script>
                  const ws = new WebSocket(\`ws://\${window.location.host}/ws\`);
                  ws.onmessage = (message) => {
                    const element = document.getElementById('chart');
                    element.innerHTML = message.data;
                    const svgElement = element.querySelector('svg');
                    if (svgElement) {
                      svgElement.removeAttribute('height');
                      svgElement.removeAttribute('width');
                      svgElement.style.maxWidth = '100%';
                      svgElement.style.maxHeight = '100%';
                    }
                  };
                </script>
              </head>
              <body>
                <div id="chart"></div>
              </body>
            </html>
          `;

          return new Response(html, {
            headers: { "Content-Type": "text/html" },
          });
        default:
          return new Response("Not Found", { status: 404 });
      }
    },
  });
};

const watchFile = async () => {
  const watcher = Deno.watchFs(input);
  for await (const event of watcher) {
    if (event.kind === "modify") {
      await generateDiagram();
    }
  }
};

// Run both server and file watcher concurrently
await Promise.all([serveHttp(), watchFile()]);
