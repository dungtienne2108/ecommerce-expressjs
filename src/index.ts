import 'dotenv/config';
import { startServer, stopServer } from './server';
import { logger } from './services/logger';

const PORT = Number(process.env.PORT || 3000);

startServer(PORT).catch((err) => {
  logger.fatal('Failed to start server:', err, { module: 'Bootstrap' });
  process.exit(1);
});

process.on('SIGINT', async () => { 
  logger.info('Received SIGINT signal, shutting down...', { module: 'Bootstrap' });
  await stopServer(); 
  process.exit(0); 
});

process.on('SIGTERM', async () => { 
  logger.info('Received SIGTERM signal, shutting down...', { module: 'Bootstrap' });
  await stopServer(); 
  process.exit(0); 
});

process.on('unhandledRejection', async (reason) => {
  logger.error('Unhandled Rejection:', new Error(String(reason)), { module: 'Bootstrap' });
  await stopServer();
  process.exit(1);
});

process.on('uncaughtException', async (err) => {
  logger.fatal('Uncaught Exception:', err, { module: 'Bootstrap' });
  await stopServer();
  process.exit(1);
});
