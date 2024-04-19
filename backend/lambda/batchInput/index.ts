import middy from '@middy/core';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { Metrics, MetricUnit, MetricResolution } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { S3Event } from 'aws-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { env } from 'process';
import { InputJsonType } from '../common/types';
import { Utils } from '../common/utils';

const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();
const s3Client: S3Client = new S3Client({ region: process.env.AWS_REGION });
const utils = new Utils();

exports.handler = 
  middy()
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(captureLambdaHandler(tracer))
  .use(logMetrics(metrics))
  .handler(async (event: S3Event): Promise<void> => {
    return await createBatches(event);
});

async function createBatches(event: S3Event): Promise<void> {
  try{
    const bucketName = env.INGEST_BUCKET;
    const bucketKey = env.BUCKET_KEY;
    const batches: InputJsonType[][] = [];
    const batchSize = Number(env.BATCH_SIZE);
    let jsonString: string = '';
    let inputJsonArray: InputJsonType[] = [];

    const { responseBodyString } = await utils.fetchResponseFromS3(event, s3Client);

    if (responseBodyString.length === 0) {
      logger.info('No records in the input JSON file');
      return;
    }

    inputJsonArray = JSON.parse(responseBodyString);
    for (let i = 0; i < inputJsonArray.length; i += batchSize) {
      batches.push(inputJsonArray.slice(i, i + batchSize));
    }
    
    logger.info(`Total Record count - ${inputJsonArray.length}`);
    logger.info(`Total Batch count - ${batches.length}`);

    for await (const batch of batches) {
      const batchNumber = batches.indexOf(batch) + 1;
      const key: string = `${bucketKey}/batch_${batchNumber}.json`;

      const command: PutObjectCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: JSON.stringify(batch),
        ContentType: 'application/json',
      });
      await utils.uploadtoS3(s3Client, command, logger);
    }
    
    metrics.addMetric(
      'JsonBatchesCreated',
      MetricUnit.Count,
      1,
      MetricResolution.High
    );
  } catch (err) {
    logger.error('Error', {err});    
  }
}

