import middy from '@middy/core';
import httpJsonBodyParser, { VersionedApiGatewayEvent } from '@middy/http-json-body-parser';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit, MetricResolution } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { APIGatewayProxyResult } from 'aws-lambda';
import { Utils } from '../common/utils';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Client } from '@opensearch-project/opensearch/.';

const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();
const utils: Utils = new Utils();
const client: Client = utils.getOSSClient();
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
});

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = 
  middy()
  .use(httpJsonBodyParser())
  .use(httpHeaderNormalizer())
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .handler(async (event: Event & VersionedApiGatewayEvent): Promise<APIGatewayProxyResult> => {
    return await textSearch(event);
});

async function textSearch(event: Event & VersionedApiGatewayEvent): Promise<APIGatewayProxyResult> {
  try {
    const error_msg = "Missing query parameter - textInput";
    const { textInput } = event.body as any;

    if (!textInput) {
      logger.error("Error", { message: error_msg });
      return utils.makeResults(500, { error: error_msg });
    }

    const input = JSON.stringify({
      inputText: textInput,
    });

    const multiModalVector: number[] = await utils.getEmbeddingForProduct(
      bedrockClient,
      input
    );

    logger.info('vector', {multiModalVector});

    const result = await utils.getOSSQueryResonse(client, multiModalVector);

    metrics.addMetric(
      "successfulTextSearch",
      MetricUnit.Count,
      1,
      MetricResolution.High
    );

    return utils.makeResults(200, result);
  } catch (err) {
    logger.error("Error", { err });
    return utils.makeResults(500, {
      error: "Server side error",
    });
  }
}
