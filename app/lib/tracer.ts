import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

let isTracingStarted = false;

export const startTracing = () => {
  // Skip if already started or no endpoint configured
  if (isTracingStarted || !process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    return;
  }

  isTracingStarted = true;

  // For troubleshooting, set the log level to DiagLogLevel.DEBUG
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

  const exporterOptions = {
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    headers: {
      Authorization: `Basic ${process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS}`,
    },
  };

  const traceExporter = new OTLPTraceExporter(exporterOptions);

  const sdk = new NodeSDK({
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: 'octotask-web',
  });

  sdk.start();
  console.log('OpenTelemetry tracing started.');

  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
};
