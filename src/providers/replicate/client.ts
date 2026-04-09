import Replicate from "replicate";

let _client: Replicate;

export function replicate(): Replicate {
  if (!_client) {
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("REPLICATE_API_TOKEN is not set");
    }
    _client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  }
  return _client;
}
