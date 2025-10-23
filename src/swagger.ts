import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options: any = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BK API',
      version: '1.0.0',
      description: 'Automatically generated API docs',
    },
    servers: [
      {
        url: process.env.BASE_URL || 'http://localhost:3000/api',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
