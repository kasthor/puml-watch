# puml-watch

A simple, lightweight PlantUML diagram previewer with live refresh using WebSockets.

## Installation

```bash
deno install -A -n puml-watch jsr:@kasthor/puml-watch
```

## Usage

Basic usage with default port (8000):
```bash
puml-watch --input diagram.puml
```

Specify a custom port:
```bash
puml-watch --input diagram.puml --port 3000
```

This will:
1. Start a local server
2. Open your default browser
3. Show your PlantUML diagram
4. Automatically refresh the diagram when you save changes to the file

## Requirements
- Deno
- An internet connection (for PlantUML server rendering)

## License

MIT
