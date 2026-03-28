import { composeService } from "../src/compose";
import { RT } from "../src/types";

export const AppService = composeService(() => ({
  Welcome() {
    return {
      message: "Welcome tu gaman ji es"
    }
  }
}));

export type AppService = RT<typeof AppService>;