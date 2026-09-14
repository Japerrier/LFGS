import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Read-only use in tests. Picks up credentials from the environment
// (AWS_PROFILE) the same way web/src/lib/dynamodb.ts and scripts/ do —
// nothing hardcoded here. Never issue Put/Update/Delete commands with this
// client from test code.
export const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
