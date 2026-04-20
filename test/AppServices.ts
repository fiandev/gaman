import { composeService } from "../src/compose";
import type { RT } from "../src/types";

export const AppService = composeService(() => ({
  Welcome() {
    return {
      message: "Welcome to gaman ji es"
    }
  }
}));

export type AppService = RT<typeof AppService>;