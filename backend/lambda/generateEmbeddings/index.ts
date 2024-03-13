import middy from "@middy/core";
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
import { S3Event } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { env } from "process";
import { EmbeddingErrorType, InputJsonType, ProductType } from "../common/types";
import { Utils } from "../common/utils";

const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
});

const utils = new Utils();

exports.handler = middy()
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .handler(async (event: S3Event): Promise<void> => {
    return await generateEmbeddings(event);
  });

async function generateEmbeddings(event: S3Event): Promise<void> {
  try {
    const { responseBodyString, key } = await utils.fetchResponseFromS3(
      event,
      s3Client
    );

    if (responseBodyString.length === 0) {
      logger.info(`No records in the batched JSON file - ${key}`);
      return;
    }

    let embeddedJsonArray: ProductType[] = [];
    let failedProductEmbeddings: EmbeddingErrorType[] = [];
    const inputJsonArray: InputJsonType[] = JSON.parse(responseBodyString);
    for await (const inputJson of inputJsonArray) {
      try {
        const imageBase64Data: string = await utils.getImageBase64DataString(
          inputJson.image_url
        );
        // logger.debug(`Image Base 64 value length: ${imageBase64Data.length}`);

        const input = JSON.stringify({
          inputImage: imageBase64Data,
          inputText: inputJson.product_title,
        });

        const multiModalVector: number[] = await utils.getEmbeddingForProduct(
          bedrockClient,
          input
        );

        embeddedJsonArray.push({
          image_path: inputJson.image_path,
          image_product_description: inputJson.product_title,
          image_url: inputJson.image_url,
          image_brand: inputJson.brand,
          image_class: inputJson.class_label,
          multimodal_vector: multiModalVector,
        });
      } catch (err) {
        failedProductEmbeddings.push({
          image_url: inputJson.image_url,
          error: (err as Error).message,
        });
        logger.error('ERROR' , {err});
        continue;
      }
    }

    logger.info(`Failed embeddings`, {
      key,
      count: failedProductEmbeddings.length,
      failedProductEmbeddings,
    });

    const command: PutObjectCommand = new PutObjectCommand({
      Bucket: env.EMBEDDINGS_BUCKET,
      Key: key,
      Body: JSON.stringify(embeddedJsonArray),
      ContentType: "application/json",
    });
    await utils.uploadtoS3(s3Client, command, logger);

    metrics.addMetric(
      "successfulEmbeddingsGeneration",
      MetricUnit.Count,
      1,
      MetricResolution.High
    );
  } catch (err) {
    logger.error("Error", { err });
  }
}
