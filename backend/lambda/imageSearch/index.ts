import middy from "@middy/core";
import httpJsonBodyParser, { VersionedApiGatewayEvent } from "@middy/http-json-body-parser";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import { Logger } from "@aws-lambda-powertools/logger";
import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { Tracer } from "@aws-lambda-powertools/tracer";
import {
  Metrics,
  MetricUnit,
  MetricResolution,
} from "@aws-lambda-powertools/metrics";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer/middleware";
import { logMetrics } from "@aws-lambda-powertools/metrics/middleware";
import { APIGatewayProxyResult } from "aws-lambda";
import { Utils } from "../common/utils";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { Client } from "@opensearch-project/opensearch/.";
import { S3Client } from "@aws-sdk/client-s3";

const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();
const utils: Utils = new Utils();
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const client: Client = utils.getOSSClient();
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
});

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
exports.handler = middy()
  .use(httpJsonBodyParser())
  .use(httpHeaderNormalizer())
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .handler(async (event: Event & VersionedApiGatewayEvent): Promise<APIGatewayProxyResult> => {
    return await imageSearch(event);
  });

  async function imageSearch(event: Event & VersionedApiGatewayEvent): Promise<APIGatewayProxyResult> {
    try {
      const error_msg = "Missing query parameter - imageInput";
      const { textInput, imageInput } = event.body as any;

      if (!imageInput) {
        logger.error("Error", { message: error_msg });
        return utils.makeResults(500, { error: error_msg });
      }
      const input = JSON.stringify({
        inputImage: imageInput,
        inputText: textInput
      });

      const multiModalVector: number[] = await utils.getEmbeddingForProduct(
        bedrockClient,
        input
      );

      const result = await utils.getOSSQueryResonse(client, multiModalVector);

      for await (let product of result.hits) {
        const image_path = await utils.createPresignedUrl(s3Client, product._source.image_path);
        product._source.image_path = image_path;
      }

      metrics.addMetric(
        "successfulImageSearch",
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