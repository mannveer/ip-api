import client from 'prom-client';


// Create a Registry to register the metrics
const register = new client.Registry();

// Default labels added to all metrics
register.setDefaultLabels({
  app: 'your-node-app',
});

// Collect default metrics (e.g., CPU, memory usage, etc.)
client.collectDefaultMetrics({ register });

// Custom HTTP request counter
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Custom HTTP request duration histogram
const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Histogram of HTTP request durations in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

// Register the custom metrics
register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDurationHistogram);

// Middleware to track HTTP requests
function trackHttpRequests(req, res, next) {
  const end = httpRequestDurationHistogram.startTimer({
    method: req.method,
    route: req.route ? req.route.path : req.path,
  });

  res.on('finish', () => {
    httpRequestCounter.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status_code: res.statusCode,
    });
    end({ status_code: res.statusCode });
  });

  next();
}

// Function to expose metrics for Prometheus
async function exposeMetrics(req, res) {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();  // Await the metrics data
    res.end(metrics);  // Send the resolved metrics data
  } catch (err) {
    res.status(500).json({ status: 'error', statusCode: 500, message: err.message });
  }
}


export { trackHttpRequests, exposeMetrics, register };
