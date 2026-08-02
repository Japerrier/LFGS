import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Picks up credentials from the environment (e.g. AWS_PROFILE) the same way
// the seed scripts in scripts/ do — nothing hardcoded here.
export const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
