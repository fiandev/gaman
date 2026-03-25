# @gaman/cors
**Lightweight & High-Performance CORS Middleware for GamanJS**. Built for Bun, optimized for speed.

## Installation
```bash
bun add @gaman/cors
```

## Quick Used
```ts
import { defineBootstrap } from "gaman";
import { Cors } from "@gaman/cors";

defineBootstrap((app) => {
  app.mount(Cors());
  
  app.mountServer(...)
});
```