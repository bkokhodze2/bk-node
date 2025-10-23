// Minimal ambient module declarations for swagger packages
declare module 'swagger-jsdoc' {
  // Provide a very small declaration to allow TypeScript imports
  const swaggerJSDoc: any;
  export default swaggerJSDoc;
}

declare module 'swagger-ui-express' {
  import express = require('express');
  const swaggerUi: {
    serve: express.RequestHandler;
    setup: (spec: any, options?: any) => express.RequestHandler;
  };
  export default swaggerUi;
}
