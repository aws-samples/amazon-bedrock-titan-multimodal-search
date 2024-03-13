import middy from '@middy/core';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit, MetricResolution } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { S3Event } from 'aws-lambda';
import { env } from 'process';
import { Utils } from '../common/utils';
import { S3Client } from '@aws-sdk/client-s3';
import { ProductType } from '../common/types';
import { Client } from '@opensearch-project/opensearch/.';

const logger: Logger = new Logger();
const tracer: Tracer = new Tracer();
const metrics: Metrics = new Metrics();
const utils: Utils = new Utils();
const client: Client = utils.getOSSClient();
const s3: S3Client = new S3Client({ region: process.env.AWS_REGION });

exports.handler = 
  middy()
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .handler(async (event: S3Event): Promise<void> => {
    return saveEmbeddings(event);
});

async function saveEmbeddings(event: S3Event): Promise<void> {
  try{
    const { responseBodyString, key } = await utils.fetchResponseFromS3(event, s3);

    if (responseBodyString.length === 0) {
      logger.info(`No records in the batched JSON file - ${key}`);
      return;
    }

    const products: ProductType[] = JSON.parse(responseBodyString);
    const indexName = env.INDEX_NAME ?? '';
    const bulkProduct = products.flatMap(doc => [{ index: { _index: indexName } }, doc])
    await client.bulk({
      body: bulkProduct,
    });

    metrics.addMetric(
      'successfulSaveOfEmbeddings',
      MetricUnit.Count,
      1,
      MetricResolution.High
    );

  } catch (err) {
    logger.error('Save embeddings Failed', {err});    
  }
}
