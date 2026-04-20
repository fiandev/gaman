# @gaman/static
**Secure, Lightweight & High-Performance Static File Server for GamanJS**. Built for Bun, optimized for speed with non-blocking I/O, built-in compression, and ETag caching.

## Installation
```bash
bun add @gaman/static
```

## Quick Used
By default, this middleware will serve files from the `public/` folder in the root of your project.
```ts
import { defineBootstrap } from "gaman";
import { StaticServe } from "@gaman/static";

defineBootstrap((app) => {
  // Mount the static server
  app.mount(StaticServe());
  
  app.mountServer(...)
});
```