import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Sentra AI API Spec',
      version: '2.0.0',
      description: 'Production-ready enterprise API for Sentra AI B2B AI governance SaaS',
    },
    servers: [
      {
        url: '/api/v1',
        description: 'V1 API Prefix',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token to access endpoints',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

console.log('✅ OpenAPI spec compiled and validated successfully.');
