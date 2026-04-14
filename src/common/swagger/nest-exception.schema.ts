export function nestHttpExceptionSchema(
  statusCode: number,
  error: string,
  messageExample = 'Validation failed',
) {
  return {
    type: 'object',
    properties: {
      statusCode: { type: 'number', example: statusCode },
      message: {
        oneOf: [
          { type: 'string', example: messageExample },
          { type: 'array', items: { type: 'string' } },
        ],
      },
      error: { type: 'string', example: error },
    },
  };
}
