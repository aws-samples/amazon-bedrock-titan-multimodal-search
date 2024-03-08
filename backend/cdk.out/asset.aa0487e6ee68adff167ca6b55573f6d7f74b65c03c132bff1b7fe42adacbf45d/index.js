"use strict";

// lambda/node_modules/@middy/core/index.js
var import_node_stream = require("node:stream");
var import_promises = require("node:stream/promises");
var import_node_timers = require("node:timers");
var defaultLambdaHandler = () => {
};
var defaultPlugin = {
  timeoutEarlyInMillis: 5,
  timeoutEarlyResponse: () => {
    const err = new Error("[AbortError]: The operation was aborted.", {
      cause: { package: "@middy/core" }
    });
    err.name = "TimeoutError";
    throw err;
  },
  streamifyResponse: false
  // Deprecate need for this when AWS provides a flag for when it's looking for it
};
var middy = (lambdaHandler = defaultLambdaHandler, plugin = {}) => {
  if (typeof lambdaHandler !== "function") {
    plugin = lambdaHandler;
    lambdaHandler = defaultLambdaHandler;
  }
  plugin = { ...defaultPlugin, ...plugin };
  plugin.timeoutEarly = plugin.timeoutEarlyInMillis > 0;
  plugin.beforePrefetch?.();
  const beforeMiddlewares = [];
  const afterMiddlewares = [];
  const onErrorMiddlewares = [];
  const middyHandler = (event = {}, context = {}) => {
    plugin.requestStart?.();
    const request = {
      event,
      context,
      response: void 0,
      error: void 0,
      internal: plugin.internal ?? {}
    };
    return runRequest(
      request,
      beforeMiddlewares,
      lambdaHandler,
      afterMiddlewares,
      onErrorMiddlewares,
      plugin
    );
  };
  const middy2 = plugin.streamifyResponse ? awslambda.streamifyResponse(async (event, responseStream, context) => {
    const handlerResponse = await middyHandler(event, context);
    let handlerBody = handlerResponse;
    if (handlerResponse.statusCode) {
      handlerBody = handlerResponse.body ?? "";
      delete handlerResponse.body;
      responseStream = awslambda.HttpResponseStream.from(
        responseStream,
        handlerResponse
      );
    }
    let handlerStream;
    if (handlerBody._readableState) {
      handlerStream = handlerBody;
    } else if (typeof handlerBody === "string") {
      function* iterator(input) {
        const size = 16384;
        let position = 0;
        const length = input.length;
        while (position < length) {
          yield input.substring(position, position + size);
          position += size;
        }
      }
      handlerStream = import_node_stream.Readable.from(iterator(handlerBody));
    }
    if (!handlerStream) {
      throw new Error("handler response not a ReadableStream");
    }
    await (0, import_promises.pipeline)(handlerStream, responseStream);
  }) : middyHandler;
  middy2.use = (middlewares) => {
    if (!Array.isArray(middlewares)) {
      middlewares = [middlewares];
    }
    for (const middleware of middlewares) {
      const { before, after, onError } = middleware;
      if (before || after || onError) {
        if (before)
          middy2.before(before);
        if (after)
          middy2.after(after);
        if (onError)
          middy2.onError(onError);
      } else {
        throw new Error(
          'Middleware must be an object containing at least one key among "before", "after", "onError"'
        );
      }
    }
    return middy2;
  };
  middy2.before = (beforeMiddleware) => {
    beforeMiddlewares.push(beforeMiddleware);
    return middy2;
  };
  middy2.after = (afterMiddleware) => {
    afterMiddlewares.unshift(afterMiddleware);
    return middy2;
  };
  middy2.onError = (onErrorMiddleware) => {
    onErrorMiddlewares.unshift(onErrorMiddleware);
    return middy2;
  };
  middy2.handler = (replaceLambdaHandler) => {
    lambdaHandler = replaceLambdaHandler;
    return middy2;
  };
  return middy2;
};
var handlerAbort = new AbortController();
var runRequest = async (request, beforeMiddlewares, lambdaHandler, afterMiddlewares, onErrorMiddlewares, plugin) => {
  let timeoutID;
  const timeoutEarly = plugin.timeoutEarly && request.context.getRemainingTimeInMillis;
  try {
    await runMiddlewares(request, beforeMiddlewares, plugin);
    if (typeof request.response === "undefined") {
      plugin.beforeHandler?.();
      if (handlerAbort.signal.aborted) {
        handlerAbort = new AbortController();
      }
      const promises = [
        lambdaHandler(request.event, request.context, {
          signal: handlerAbort.signal
        })
      ];
      if (timeoutEarly) {
        let timeoutResolve;
        const timeoutPromise = new Promise((resolve, reject) => {
          timeoutResolve = () => {
            handlerAbort.abort();
            try {
              resolve(plugin.timeoutEarlyResponse());
            } catch (e) {
              reject(e);
            }
          };
        });
        timeoutID = (0, import_node_timers.setTimeout)(
          timeoutResolve,
          request.context.getRemainingTimeInMillis() - plugin.timeoutEarlyInMillis
        );
        promises.push(timeoutPromise);
      }
      request.response = await Promise.race(promises);
      if (timeoutID) {
        clearTimeout(timeoutID);
      }
      plugin.afterHandler?.();
      await runMiddlewares(request, afterMiddlewares, plugin);
    }
  } catch (e) {
    if (timeoutID) {
      clearTimeout(timeoutID);
    }
    request.response = void 0;
    request.error = e;
    try {
      await runMiddlewares(request, onErrorMiddlewares, plugin);
    } catch (e2) {
      e2.originalError = request.error;
      request.error = e2;
      throw request.error;
    }
    if (typeof request.response === "undefined")
      throw request.error;
  } finally {
    await plugin.requestEnd?.(request);
  }
  return request.response;
};
var runMiddlewares = async (request, middlewares, plugin) => {
  for (const nextMiddleware of middlewares) {
    plugin.beforeMiddleware?.(nextMiddleware.name);
    const res = await nextMiddleware(request);
    plugin.afterMiddleware?.(nextMiddleware.name);
    if (typeof res !== "undefined") {
      request.response = res;
      return;
    }
  }
};
var core_default = middy;

// lambda/saveEmbeddings/index.ts
var import_logger = require("@aws-lambda-powertools/logger");
var import_middleware = require("@aws-lambda-powertools/logger/middleware");
var import_tracer = require("@aws-lambda-powertools/tracer");
var import_metrics = require("@aws-lambda-powertools/metrics");
var import_middleware2 = require("@aws-lambda-powertools/tracer/middleware");
var import_middleware3 = require("@aws-lambda-powertools/metrics/middleware");
var logger = new import_logger.Logger();
var tracer = new import_tracer.Tracer();
var metrics = new import_metrics.Metrics();
exports.handler = core_default().use((0, import_middleware.injectLambdaContext)(logger, { logEvent: true })).use((0, import_middleware2.captureLambdaHandler)(tracer)).use((0, import_middleware3.logMetrics)(metrics)).handler(async (event, context) => {
  try {
    metrics.addMetric(
      "successfulSaveOfEmbeddings",
      import_metrics.MetricUnit.Count,
      1,
      import_metrics.MetricResolution.High
    );
  } catch (err) {
    logger.error("Error", { err });
  }
});
