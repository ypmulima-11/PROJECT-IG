import { DemoSystem } from "./infrastructure/demo/createDemoSystem.ts";
import { createApp } from "./http/createApp.ts";

const port = Number(process.env.PORT ?? 4000);
const { server } = createApp(new DemoSystem());
server.listen(port, () => console.log(`Project IG demo API listening at http://localhost:${port}`));
