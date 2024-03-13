import { Construct } from 'constructs';
import { CfnOutput, Stack } from 'aws-cdk-lib';
import { opensearch_vectorindex, opensearchserverless } from '@cdklabs/generative-ai-cdk-constructs';

export class VectorCollectionConstruct extends Construct {
  public indexName: string;
  public collectionEndpoint: string
  public productCollection: opensearchserverless.VectorCollection;
  public productsIndex: opensearch_vectorindex.VectorIndex

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const region = Stack.of(this).region;
    
    this.productCollection = new opensearchserverless.VectorCollection(
      this,
      'products-collection'
    );
    
    this.collectionEndpoint = `https://${this.productCollection.collectionId}.${region}.aoss.amazonaws.com`;
    this.indexName = 'products-index';
    
    this.productsIndex = new opensearch_vectorindex.VectorIndex(
      this,
      'productsIndex',
      {
        collection: this.productCollection,
        indexName:  this.indexName,
        mappings: this.getVectorIndexMapping(),
        vectorField: 'multimodal_vector',
        vectorDimensions: 1024,
      }
    );
    
    new CfnOutput(this, 'CollectionEndpoint', {
      value: this.collectionEndpoint, 
    });
  }

  private getVectorIndexMapping(): opensearch_vectorindex.MetadataManagementFieldProps[] {
    return [
      {
        dataType: 'text',
        filterable: true,
        mappingField: 'image_path',
      },
      {
        dataType: 'text',
        filterable: true,
        mappingField: 'image_product_description',
      },
      {
        dataType: 'text',
        filterable: true,
        mappingField: 'image_brand',
      },
      {
        dataType: 'text',
        filterable: true,
        mappingField: 'image_class',
      },
      {
        dataType: 'text',
        filterable: true,
        mappingField: 'image_url',
      },
    ];
  }
}