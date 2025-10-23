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
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            age: { type: 'integer' },
            address: { type: 'object' },
          },
        },
        Product: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Flat: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            square: { type: 'number' },
            price: { type: 'number' },
            currency: { type: 'string' },
            address: { type: 'object' },
            images: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export { swaggerUi, swaggerSpec };
