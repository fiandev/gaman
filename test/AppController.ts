import { composeController } from "../src/compose";
import { AppService } from "./AppServices";

export type AppController = {
  appService: AppService;
}

export default composeController(({ appService }: AppController) => {
  return {
    ANu (ctx) {
      return ctx.send(appService.Welcome())
    }
  }
});