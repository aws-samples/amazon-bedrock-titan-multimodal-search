import { Logger } from "@aws-lambda-powertools/logger";
import {
  InvokeModelCommandOutput,
  InvokeModelCommand,
  BedrockRuntimeClient,
} from "@aws-sdk/client-bedrock-runtime";
import {
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { S3Event } from "aws-lambda";
import { defaultProvider } from "@aws-sdk/credential-provider-node"; // V3 SDK.
import { Client as ossClient } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class Utils {
  makeResults(statusCode: number, body: object) {
    return {
      statusCode: statusCode,
      body: JSON.stringify(body),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  }

  async uploadtoS3(s3: S3Client, command: PutObjectCommand, logger: Logger) {
    const key = command.input.Key;
    try {
      await s3.send(command);
      logger.info(`S3 upload for - ${key} saved successfully`);
    } catch (err) {
      logger.info(`S3 upload for - ${key} save failed`);
    }
  }

  async fetchResponseFromS3(event: S3Event, s3: S3Client) {
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(
      event.Records[0].s3.object.key.replace(/\+/g, " ")
    );

    const response: GetObjectCommandOutput = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: key })
    );
    const responseBodyString = (await response.Body?.transformToString()) ?? "";
    return { responseBodyString, key };
  }

  async getEmbeddingForProduct(
    bedrockClient: BedrockRuntimeClient,
    input: string
  ) {
    try {
      const textDecoder = new TextDecoder("utf-8");

      const invokeResponse: InvokeModelCommandOutput = await bedrockClient.send(
        new InvokeModelCommand({
          modelId: process.env.MODEL_ID,
          contentType: "application/json",
          accept: "application/json",
          body: input,
        })
      );

      const response_body = JSON.parse(textDecoder.decode(invokeResponse.body));
      return response_body.embedding;
    } catch (error) {
      throw error;
    }
  }

  async getImageBase64DataString(
    s3Client: S3Client,
    image_path: string
  ): Promise<string> {
    const bucket = process.env.INGEST_BUCKET;
    const response: GetObjectCommandOutput = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: image_path })
    );
    const responseBodyString =
      (await response.Body?.transformToString("base64")) ?? "";

    return responseBodyString;
    // const response = await fetch(image_url);
    // return Buffer.from(
    //   await response.arrayBuffer()
    // ).toString('base64');
  }

  async createPresignedUrl(s3Client: S3Client, key: string): Promise<string> {
    const bucket = process.env.INGEST_BUCKET;
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn: 3600 });
  }

  getOSSClient(): ossClient {
    return new ossClient({
      ...AwsSigv4Signer({
        region: process.env.REGION ?? "",
        service: "aoss",
        getCredentials: () => {
          const credentialsProvider = defaultProvider();
          return credentialsProvider();
        },
      }),
      node: process.env.COLLECTION_ENDPOINT ?? "",
      maxRetries: 3,
    });
  }

  async getOSSQueryResonse(
    client: ossClient,
    multiModalVector: number[]
  ): Promise<any> {
    const query = {
      size: process.env.QUERY_RESULT_SIZE,
      query: {
        knn: {
          multimodal_vector: {
            vector: multiModalVector,
            k: 5,
          },
        },
      },
      _source: [
        "image_product_description",
        "image_path",
        "image_brand",
        "image_class",
        "image_url",
      ],
    };

    const response = await client.search({
      index: process.env.INDEX_NAME,
      body: query,
    });
    console.log(response);

    return response.body.hits;
  }
}
