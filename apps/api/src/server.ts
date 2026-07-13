import { createNestApplication } from "./app/create-nest-application.js";
import { loadApiConfig } from "./app/config/load-api-config.js";

async function bootstrap() {
  const config = loadApiConfig();
  const application = await createNestApplication(config);

  application.enableShutdownHooks();
  await application.listen(config.port, "0.0.0.0");

  application
    .getHttpAdapter()
    .getInstance()
    .log.info({ event: "api_started", port: config.port });
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(
    `${JSON.stringify({ event: "api_start_failed", level: "fatal", message })}\n`
  );
  process.exitCode = 1;
});
