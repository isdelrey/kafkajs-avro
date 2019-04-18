import fetch from "node-fetch";
import * as avsc from "avsc";

class Registry {
  url: string;
  parseOptions: any;
  cache: Map<string, { id: number; schema: string }>;
  constructor({ url, parseOptions }) {
    this.url = url;
    this.parseOptions = parseOptions;
    this.cache = new Map();
  }
  async getSchema(filter) {
    const key = filter.id ? filter.id : `${filter.subject}:${filter.version}`;
    /* Check if schema is in cache: */
    if (this.cache.has(key)) {
      const { id, schema } = this.cache.get(key);
      return {
        id,
        schema: avsc.parse(schema, this.parseOptions)
      };
    }

    /* Schema is not in cache, download it: */
    let url;
    if (filter.id) url = `${this.url}/schemas/ids/${filter.id}`;
    if (filter.subject && filter.version)
      url = `${this.url}/subjects/${filter.subject}/versions/${filter.version}`;
    if (url == undefined)
      throw new Error(
        "In order to fetch a schema, an object with format {id} or {subject, version} must be provided"
      );

    const response = await fetch(url);
    if (response.status != 200)
      throw new Error(
        `${
          response.status
        } response code from registry when trying to fetch ${JSON.stringify(
          filter
        )}\n${url}\n${response.statusText}`
      );
    const { id, schema } = await response.json();
    const parsedSchema = avsc.parse(schema, this.parseOptions);

    /* Result */
    this.cache.set(key, { id: filter.id || id, schema });
    return { id: filter.id || id, schema: parsedSchema };
  }
  async encode(subject, version, originalMessage) {
    const { id, schema } = await this.getSchema({ subject, version });
    const encodedMessage = schema.toBuffer(originalMessage);

    const message = Buffer.alloc(encodedMessage.length + 5);
    message.writeUInt8(0, 0);
    message.writeUInt32BE(id, 1);
    encodedMessage.copy(message, 5);

    return message;
  }
  async decode(object) {
    /*
      The following line is not needed because this check is done in the eachMessage function of
      the consumer. It has not been removed in case this module is used alone in the future
    
      if (object.readUInt8(0) !== 0)
        throw new Error(`Message doesn't contain schema identifier byte.`);
    */
    const id = object.readUInt32BE(1);

    const { schema } = await this.getSchema({ id });
    return schema.fromBuffer(object.slice(5));
  }
}

export default Registry;
