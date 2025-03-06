import cors from 'cors';

// const allowedOrigins = ['http://localhost:4200', 'http://your-frontend-domain.com'];

// const corsOptions = {
//     origin: (origin, callback) => {
//       if (!origin) return callback(null, true); // Allow requests with no origin (like mobile apps or Postman)
//       if (allowedOrigins.indexOf(origin) === -1) {
//         return callback(new Error('CORS not allowed from this origin'), false);
//       }
//       return callback(null, true);
//     },
//     methods: 'GET,POST,PUT,DELETE,OPTIONS',
//     allowedHeaders: 'Content-Type,Authorization',
//     credentials: true, // Allow cookies and other credentials
//   };
  
//   export default cors(corsOptions);
  
const allowedOrigins = '*';

const corsOptions = {
    origin: allowedOrigins,
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true, // Allow cookies and other credentials
};

export default cors(corsOptions);