import { loadApiConfig } from "./app/config/load-api-config.js";
import { createNestApplication } from "./app/create-nest-application.js";

async function bootstrap() {
  const config = loadApiConfig();
  const application = await createNestApplication(config);

  application.enableShutdownHooks();
  await application.listen(config.port, "0.0.0.0");

  application.getHttpAdapter().getInstance().log.info({ event: "api_started", port: config.port });
}

bootstrap().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({
      errorName: error instanceof Error ? error.name : "UnknownError",
      event: "api_start_failed",
      level: "fatal"
    })}\n`
  );
  process.exitCode = 1;
});
