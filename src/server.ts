import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import importQueue from './config/queue'; 
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import sequelize from './config/sequelize';

const app = express();
const PORT = process.env.PORT || 3000;

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Bulk Import API',
      version: '1.0.0',
      description: 'API documentation for bulk import project',
    },
  },
  apis: [path.join(__dirname, '../src/server.ts')],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Upload CSV or Excel file for bulk import
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File processed successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
app.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = path.join(__dirname, '../', req.file.path);

    const job = await importQueue.add({ filePath });

    // Wait for the job to complete
    const result = await job.finished();

    if (result.data) {
      // Send the error report file
      res.setHeader('Content-Disposition', 'attachment; filename=errorReport.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.status(200).send(result.data);
    } else {
      res.status(200).json(result);
    }

  } catch (error) {
    console.error('Error processing upload:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

app.listen(PORT, async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');
    console.log(`Server is running on http://localhost:${PORT}`);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});
