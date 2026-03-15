import type { RequestHandler } from "../context/index.types";

export type ControllerFactory<
  Args extends any[] = any[]
> = (...args: Args) => Record<string, RequestHandler>;
