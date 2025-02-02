import { PrismaClient } from '../prisma/client'
import express from 'express'
import { hash, compare } from 'bcrypt';
import passwordGenerator from 'password-generator'
import nodemailer from 'nodemailer';
import multer from 'multer';
import { Storage } from '@google-cloud/storage';
import { Decimal } from '../prisma/client/runtime/library';


const storage = new Storage({
  projectId: process.env.GOOGLE_STORAGE_ID,
  credentials: {
    private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    client_id:process.env.GOOGLE_CLOUD_CLIENT_ID,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY
  }
});


const bucket = storage.bucket(process.env.GOOGLE_BUCKET_ID!);

// Configura Multer para manejar la subida de archivos
const upload = multer({
  storage: multer.memoryStorage(),
});


export const prisma = new PrismaClient()
export const app = express()

const uploadFiles = async (req: any) => {
  try {

    if (req.files.length == 0) {
      throw 'No file uploaded.';
    }

    var n = Math.floor(Math.random() * 99999);

    const uploadPromises = req.files.map((file: any) => {
      const blob = bucket.file(`files/${n}_${file.originalname}`);
      const blobStream = blob.createWriteStream({
        resumable: false,
      });
      return new Promise((resolve, reject) => {

        blobStream.on('error', (err) => {
          reject(err);
        });

        blobStream.on('finish', async () => {
          await blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          resolve({
            downloadURL: publicUrl,
            fileName: file.originalname,
            fileFormatType: file.mimetype
          });
        });

        blobStream.end(file.buffer);
      })
    })

    const fileUrls = await Promise.all(uploadPromises);
    return fileUrls;
  } catch (error) {
    throw error;
  }

}
app.use(express.json())


const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE, // Puedes usar otros servicios como Outlook, Yahoo, etc.
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});


const sendEmail = (params: {
  to: string,
  subject: string,
  text: string,
  html: string
}) => {
  try {
    const { to, subject, text, html } = params;
    const mailOptions = {
      from: process.env.EMAIL_USERNAME,
      to: to,
      subject: subject,
      html
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        throw error;
      }
      return info;
    });
  } catch (e) {
    throw e;
  }
}


const createUser = async (req: any, prisma: any) => {
  const { username, email } = req.body;
  try {
    const salt = Number(process.env.PASSWORD_SALT);
    const password = passwordGenerator(10);
    const newPassword = await hash(password, salt);
    let user = await prisma.users.create({
      data: {
        username,
        email,
        password: newPassword,
        enabled: true,
        passwordChangeMode: true
      },
      include:
      {
        taxPayer: true
      }
    });
    return {
      ...user,
      displayPassword: password
    };
  } catch (e) {
    throw e;
  }
}
app.get('*', (req, res, next) => {
  var key = req.headers['key'];
  if (key == process.env.KEY) {
    next();
  }
  else {
    res.status(401).json({
      error: 'NO AUTORIZADO'
    })
  }
})
app.get('/', (req, res) => {
  res.send('OK')
})
app.get(`/users`, async (_req, res) => {
  try {
    const result = await prisma.users.findMany({
      include: {
        taxPayer: true
      }
    })
    res.json(result)
  } catch (error) {
    res.status(501).json({
      error
    })
  }
})

app.get(`/users/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await prisma.users.findFirst({
      where: {
        id
      },
      include: {
        taxPayer: true
      }
    })
    res.json(result)
  } catch (error) {
    res.status(501).json({
      error
    })
  }
})

app.post('/sign-in', async (req, res) => {
  const { username, password } = req.body;
  try {
    let user = await prisma.users.findFirst({
      where: {
        username
      },
      include: {
        taxPayer: true
      }
    })


    if (user) {
      if (await compare(password, user!.password)) {
        res.json(user)
      } else {
        res.status(401).json({
          error: 'CREDENCIALES NO VALIDAS'
        })
      }
    } else {
      console.log('error')
      res.status(404).json({
        error: 'USUARIO NO ENCONTRADO'
      })
    }

  } catch (error) {
    res.status(501).json({
      error
    })
  }
})


app.post('/change-password', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { oldPassword, newPassword } = req.body;
  try {
    let user = await prisma.users.findFirst({
      where: {
        id: userId as string
      }
    });

    if (await compare(oldPassword, user!.password)) {
      var bPassword = await hash(newPassword, 10);
      user = await prisma.users.update({
        where: {
          id: userId as string
        },
        data: {
          password: bPassword,
          passwordChangeMode: false
        },
        include: {
          taxPayer: true
        }
      })

      if (user) {
        res.json({
          message: "CREDENCIALES CAMBIADAS CORRECTAMENTE"
        })
      }
    } else {
      res.status(401).json({
        error: 'CREDENCIALES NO VALIDAS'
      })
    }

  } catch (error) {
    console.log(error)
    res.status(501).json({
      error
    })
  }
})

app.post('/users', async (req, res) => {
  try {
    const user = await createUser(req, prisma);
    res.json(user)
  } catch (error) {
    res.status(501).json({ error })
  }
})

app.get(`/purchases-or-expenses`, async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  const { startDate, endDate, search } = req.query;

  let start, end;
  let ranges = {};

  if (typeof startDate == 'string' && typeof endDate == 'string') {
    start = new Date(startDate as string);
    end = new Date(endDate as string);

    var calcs = (!isNaN(parseFloat(search as string))) ? [
      {
        total: {
          equals: parseFloat(search as string)
        },
      },
      {
        tax: {
          equals: parseFloat(search as string)
        },
      },
      {
        netAmount: {
          equals: parseFloat(search as string)
        }
      },
      {
        retentionTaxValue: {
          equals: parseFloat(search as string)
        }
      },
      {
        retentionIsrValue: {
          equals: parseFloat(search as string)
        }
      }
    ] : [];
    ranges = {
      AND: [
        {
          OR: [
            {
              issueDate: {
                gte: start,
                lte: end,
              },
            },
            {
              retentionDate: {
                gte: start,
                lte: end,
              },
            },
          ],
        },
        {
          OR: [
            {
              rncOrId: {
                contains: search as string,
              },
            },
            {
              concept: {
                name: {
                  contains: search as string
                }
              },
            },
            {
              ncf: {
                contains: search as string
              },
            },
            {
              ncfAffected: {
                contains: search as string
              },
            },
            {
              taxPayer: {
                name: {
                  contains: search as string
                }
              },
            },

            ...calcs
          ]
        }
      ]
    };
  }

  try {
    const result = await prisma.purchasesOrExpenses.findMany({
      where: {
        ...ranges,
        authorId: {
          equals: userId ?? 'x'
        }
      },
      orderBy: [
        {
          ncf: 'asc'
        },
        {
          issueDate: 'asc'
        },
      ],
      include: {
        author: {
          include: {
            taxPayer: true
          }
        },
        concept: {
          include: {
            invoiceType: true,
            classificationType: true
          }
        },
        taxPayer: true,
        taxPayerType: true,
        paymentMethod: true,
        ncfType: {
          include: {
            serial: true
          }
        },
        ncfAffectType: {
          include: {
            serial: true
          }
        },
        retentionTax: true,
        retentionIsr: true,
        costTaxStatus: true
      }
    });

    const filteredResult = result.map(item => {
      const retentionDate = item.retentionDate ? new Date(item.retentionDate!) : null;
      var n1 = start!.getUTCMonth();
      var n2 = start!.getFullYear();
      var n3 = retentionDate?.getUTCMonth();
      var n4 = retentionDate?.getFullYear();

      if (n1 !== n3 && n2 == n4) {
        item.retentionDate = null;
        item.retentionTaxValue = new Decimal(0);
        item.retentionIsrValue = new Decimal(0);
      }

      if (n1 !== n3 && n2 != n4) {
        item.retentionDate = null;
        item.retentionTaxValue = new Decimal(0);
        item.retentionIsrValue = new Decimal(0);
      }

      return item;
    });

    res.json(filteredResult);
  } catch (error) {
    console.log(error);
    res.status(501).json({
      error
    });
  }
});






app.post(`/purchases-or-expenses`, async (req, res) => {
  const { rncOrId, manual, ncf, ncfAffected, costTaxStatusId, issueDate, retentionDate, total, tax, authorId, ncfsTypesId, ncfsAffectTypeId, conceptId, taxPayerTypesId, paymentsMethodsId, retentionTaxId, retentionIsrId } = req.body;
  try {
    const result = await prisma.purchasesOrExpenses.create(
      {
        data: {
          rncOrId,
          ncf,
          ncfAffected,
          issueDate,
          retentionDate,
          total,
          tax,
          authorId,
          ncfsTypesId,
          conceptId,
          taxPayerTypesId,
          paymentsMethodsId,
          retentionTaxId,
          retentionIsrId,
          ncfsAffectTypeId,
          costTaxStatusId,
          manual
        },
        include: {
          author: {
            include: {
              taxPayer: true
            }
          },
          concept: true,
          taxPayer: true,
          taxPayerType: true,
          paymentMethod: true,
          ncfType: true,
          ncfAffectType: true,
          retentionTax: true,
          retentionIsr: true,
          costTaxStatus: true
        }
      }
    )
    res.json(result)
  } catch (error) {
    console.log(error)
    res.status(501).json({
      error
    })
  }
})


app.put(`/purchases-or-expenses/:id`, async (req, res) => {
  const { id } = req.params;
  const { rncOrId, ncf, ncfAffected, issueDate, costTaxStatusId, retentionDate, total, tax, ncfsTypesId, ncfsAffectTypeId, conceptId, taxPayerTypesId, paymentsMethodsId, retentionTaxId, retentionIsrId } = req.body;
  let updatedAt = new Date();
  try {
    const result = await prisma.purchasesOrExpenses.update(
      {
        where: {
          id
        },
        data: {
          rncOrId,
          ncf,
          ncfAffected,
          issueDate,
          retentionDate,
          total,
          tax,
          ncfsTypesId,
          conceptId,
          taxPayerTypesId,
          paymentsMethodsId,
          retentionTaxId,
          retentionIsrId,
          ncfsAffectTypeId,
          costTaxStatusId,
          updatedAt,

        },
        include: {
          author: {
            include: {
              taxPayer: true
            }
          },
          concept: true,
          taxPayer: true,
          taxPayerType: true,
          paymentMethod: true,
          ncfType: true,
          ncfAffectType: true,
          retentionTax: true,
          retentionIsr: true,
          costTaxStatus: true
        }
      }
    )
    res.json(result)
  } catch (error) {
    console.log(error)
    res.status(501).json({
      error
    })
  }
})

app.delete(`/purchases-or-expenses/:id`, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await prisma.purchasesOrExpenses.delete(
      {
        where: {
          id
        },
        include: {
          author: {
            include: {
              taxPayer: true
            }
          },
          concept: true,
          taxPayer: true,
          taxPayerType: true,
          paymentMethod: true,
          ncfType: true,
          ncfAffectType: true,
          retentionTax: true,
          retentionIsr: true,
          costTaxStatus: true
        }
      }
    )
    res.json({
      ...result,
      message: 'COMPRA O GASTO ELIMINADO'
    })
  } catch (error) {
    console.log(error)
    res.status(501).json({
      error
    })
  }
})
app.get(`/concepts`, async (req, res) => {
  const userId = req.headers['x-user-id']
  const { words } = req.query;

  let name = {};

  if (words) {
    name = {
      contains: words as string,
    };
  }
  const result = await prisma.concepts.findMany({
    where: {
      authorId: userId as string,
      ...name
    },
    include: {
      invoiceType: true,
      classificationType: true,
      author: true
    }
  })
  res.json(result)
})

app.post(`/concepts`, async (req, res) => {
  try {
    const userId = req.headers['x-user-id']
    const { name, classificationTypeId, invoiceTypeId } = req.body;
    const result = await prisma.concepts.create({
      data: {
        name,
        classificationTypeId,
        invoiceTypeId,
        authorId: userId as string
      },
      include: {
        invoiceType: true,
        classificationType: true,
        author: true
      }
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.put(`/concepts/:id`, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id']
    const { name, classificationTypeId, invoiceTypeId } = req.body;
    const result = await prisma.concepts.update({
      where: {
        id: Number(id)
      },
      data: {
        name,
        classificationTypeId,
        invoiceTypeId,
        authorId: userId as string
      },
      include: {
        invoiceType: true,
        classificationType: true,
        author: true
      }
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error })
  }
})


app.get(`/invoice-types`, async (_req, res) => {
  const result = await prisma.invoiceType.findMany()
  res.json(result)
})

app.get(`/tax-payer-types`, async (_req, res) => {
  const result = await prisma.taxPayerTypes.findMany()
  res.json(result)
})

app.get(`/payments-methods`, async (_req, res) => {
  const result = await prisma.paymentsMethods.findMany()
  res.json(result)
})

app.get(`/ncfs-types`, async (_req, res) => {
  const result = await prisma.ncfsTypes.findMany({
    include: {
      serial: true
    }
  })
  res.json(result)
})

app.get(`/retentions-isr-models`, async (_req, res) => {
  const result = await prisma.retentionIsr.findMany()
  res.json(result)
})

app.get(`/retentions-taxes-models`, async (_req, res) => {
  const result = await prisma.retentionTax.findMany()
  res.json(result)
})

app.get(`/cost-tax-status-models`, async (_req, res) => {
  const result = await prisma.costTaxStatus.findMany()
  res.json(result)
})


app.get(`/request-status-models`, async (_req, res) => {
  const result = await prisma.requestStatus.findMany()
  res.json(result)
})

app.get(`/requests`, async (_req, res) => {
  try {
    const result = await prisma.requests.findMany({
      include: {
        Documents: {
          include: {
            documentType: true
          }
        },
        taxPayer: true,
        status: true,
      }
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.get(`/requests/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await prisma.requests.findFirst({
      where: {
        id
      },
      include: {
        Documents: {
          include: {
            documentType: true
          }
        },
        taxPayer: true,
        status: true,
      }
    })
    res.json(result)
  } catch (error) {
    res.status(500).json({ error })
  }
})


app.post('/uploads', upload.array('files', 10), async (req, res) => {
  try {
    console.log(req.file);
    console.log(req.files);
    const files = await uploadFiles(req);
    let docs = [];

    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      let doc: {
        fileName: string,
        downloadURL: string,
        fileFormatType: string
      } = {
        fileName: file.fileName,
        downloadURL: file.downloadURL,
        fileFormatType: file.fileFormatType
      };

      docs[i] = doc;
    }
    res.json(docs);
  } catch (error) {
    console.log(error)
    res.status(501).json({
      error
    })
  }
})
app.post('/requests', upload.array('files', 2), async (req, res) => {
  try {
    let { username, email, documentsTypes } = req.body;



    let documents = [];
    let docsTypes = JSON.parse(documentsTypes);



    const files = await uploadFiles(req);


    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      let docType = docsTypes[i];
      let doc: {
        fileName: string,
        downloadURL: string,
        fileFormatType: string
        documentTypeId: number
      } = {
        fileName: file.fileName,
        downloadURL: file.downloadURL,
        fileFormatType: file.fileFormatType,
        documentTypeId: docType
      };

      documents[i] = doc;
    }


    let result = await prisma.requests.create({
      data: {
        username,
        email,
        requestStatusId: 1,
        Documents: {
          create: documents
        },

      },
      include: {
        taxPayer: true,
        status: true,
        Documents: true
      }

    });

    res.json(result)
  } catch (error) {
    console.log(error)
    res.status(501).json({
      error
    })
  }
})

app.post('/requests/accept/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    let result = await prisma.$transaction(async (prisma) => {

      let result = await prisma.requests.update({

        where: {
          id
        },
        data: {
          requestStatusId: 2
        },
        include: {
          Documents: true,
          taxPayer: true,
          status: true
        }

      });

      let user = await createUser(req, prisma);

      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'COMPRA DE PRODUCTOS PARA REVENDER',
          invoiceTypeId: '09',
          classificationTypeId: 2
        }
      });


      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'COMPRA DE VEHICULOS',
          invoiceTypeId: '09',
          classificationTypeId: 2
        }
      });

      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'COMPRA DE MATERIAL FERRETERO PARA REVENDER',
          invoiceTypeId: '09',
          classificationTypeId: 2
        }
      });

      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'GASTOS DE FERRETERIA PARA USO PERSONAL',
          invoiceTypeId: '04',
          classificationTypeId: 2
        }
      });

      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'PUBLICIDAD',
          invoiceTypeId: '05',
          classificationTypeId: 1
        }
      });

      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'SEGURO DE SALUD',
          invoiceTypeId: '11',
          classificationTypeId: 1
        }
      });

      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'PRIMAS DE SEGUROS',
          invoiceTypeId: '06',
          classificationTypeId: 1
        }
      });


      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'FARMACIA',
          invoiceTypeId: '02',
          classificationTypeId: 2
        }
      });

      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'ENERGIA ELECTRICA',
          invoiceTypeId: '02',
          classificationTypeId: 1
        }
      });


      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'AGUA',
          invoiceTypeId: '02',
          classificationTypeId: 2
        }
      });

      await prisma.concepts.create({
        data: {
          authorId: user.id,
          name: 'DIETA',
          invoiceTypeId: '02',
          classificationTypeId: 2
        }
      });


      await sendEmail({
        to: email,
        subject: 'FORM 606 ELECTRONIC SCAN - CUENTA APROBADA',
        text: '',
        html: `<div>
          <h4>USUARIO: ${user.username}</h4>
          <h4>CLAVE: ${user.displayPassword}</h4>
         </div>`
      });
      return result
    });


    res.json(result)
  } catch (error) {
    console.log(error)
    res.status(501).json({
      error
    })
  }
})

app.post('/requests/cancel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, reason } = req.body;
    let result = await prisma.$transaction(async (prisma) => {
      let result = await prisma.requests.update({

        where: {
          id
        },
        data: {
          requestStatusId: 3
        },
        include: {
          Documents: true,
          taxPayer: true,
          status: true
        }

      });

      await sendEmail({
        to: email,
        subject: 'DGII ELECTRONIC APP - SOLICITUD RECHAZADA',
        text: '',
        html: `<div>
          <h4>${reason}</h4>
         </div>`
      });
      return result;
    })

    res.json(result)
  } catch (error) {
    console.log(error)
    res.status(501).json({
      error
    })
  }
})

app.delete('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let result = await prisma.$transaction(async (prisma) => {

      await prisma.documents.deleteMany({ where: { requestId: id } });
      let result = await prisma.requests.delete({

        where: {
          id
        },

        include: {
          Documents: true,
          taxPayer: true,
          status: true
        }

      });
      return result;
    })

    res.json(result)
  } catch (error) {
    console.log(error)
    res.status(501).json({
      error
    })
  }
})

app.get(`/documents`, async (_req, res) => {
  const result = await prisma.documents.findMany()
  res.json(result)
})

app.get('/taxpayers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let result = await prisma.taxPayer.findFirst({
      where: {
        id
      }
    });

    if (!result) {
      throw 'EL RNC/CEDULA NO EXISTE';
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error })
  }
})

app.get('/get-report-by-invoice-type', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { startDate, endDate } = req.query;
  try {
    var result = await prisma.$queryRaw`
      SELECT * FROM (
        SELECT
          iv.name as "Nombre", 
          TO_CHAR(COALESCE(sum(total), 0), 'FM999,999,999,999.00') as "Total", 
          TO_CHAR(COALESCE(sum(tax), 0), 'FM999,999,999,999.00') as "Itbis", 
          TO_CHAR(COALESCE(sum("netAmount"), 0), 'FM999,999,999,999.00') as "Neto", 
          TO_CHAR(COALESCE(sum(CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN "retentionTaxValue" ELSE 0 END), 0), 'FM999,999,999,999.00') as "Itbis Retenido",
          TO_CHAR(COALESCE(sum(CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN "retentionIsrValue" ELSE 0 END), 0), 'FM999,999,999,999.00') as "Isr Retenido",
          TO_CHAR(COALESCE(sum(CASE WHEN cl.id = 1 THEN "taxForOvertaking" ELSE 0 END), 0), 'FM999,999,999,999.00') as "Itbis en Servicios", 
          TO_CHAR(COALESCE(sum(CASE WHEN cl.id = 2 THEN "taxForOvertaking" ELSE 0 END), 0), 'FM999,999,999,999.00') as "Itbis en Bienes", 
          TO_CHAR(COALESCE(sum("netToPaid"), 0), 'FM999,999,999,999.00') as "Neto a Pagar" 
        FROM public."PurchasesOrExpenses" po
        JOIN public."Concepts" c ON po."conceptId" = c.id
        JOIN public."InvoiceType" iv ON c."invoiceTypeId" = iv.id
        JOIN public."ClassificationType" cl ON c."classificationTypeId" = cl.id
        WHERE po."authorId" = ${userId} 
          AND ("issueDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
          AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')
          OR "retentionDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
          AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ'))
        GROUP BY iv.name
        UNION ALL
        SELECT
          'Total General' as "Nombre",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po.total ELSE po.total END), 0), 'FM999,999,999,999.00') as "Total", 
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po.tax ELSE po.tax END), 0), 'FM999,999,999,999.00') as "Itbis", 
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po."netAmount" ELSE po."netAmount" END), 0), 'FM999,999,999,999.00') as "Neto", 
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionTaxValue" ELSE 0 END ELSE CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionTaxValue" ELSE 0 END END), 0), 'FM999,999,999,999.00') as "Itbis Retenido",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionIsrValue" ELSE 0 END ELSE CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionIsrValue" ELSE 0 END END), 0), 'FM999,999,999,999.00') as "Isr Retenido",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN cl.id = 1 THEN po."taxForOvertaking" ELSE 0 END ELSE CASE WHEN cl.id = 1 THEN po.tax ELSE 0 END END), 0), 'FM999,999,999,999.00') as "Itbis en Servicios",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN cl.id = 2 THEN po."taxForOvertaking" ELSE 0 END ELSE CASE WHEN cl.id = 2 THEN po.tax ELSE 0 END END), 0), 'FM999,999,999,999.00') as "Itbis en Bienes",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po."netToPaid" ELSE po."netToPaid" END), 0), 'FM999,999,999,999.00') as "Neto a Pagar"
        FROM public."PurchasesOrExpenses" po
        JOIN public."Concepts" c ON po."conceptId" = c.id
        JOIN public."InvoiceType" iv ON c."invoiceTypeId" = iv.id
        JOIN public."ClassificationType" cl ON c."classificationTypeId" = cl.id
        WHERE po."authorId" = ${userId} 
          AND ("issueDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
          AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')
          OR "retentionDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
          AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ'))
      ) AS subquery
      ORDER BY "Nombre";
    `;

    res.json(result);
  } catch (error) {
    res.status(500).json({ error });
  }
});


app.get('/get-report-by-concept-type', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { startDate, endDate } = req.query;
  try {
    var result = await prisma.$queryRaw`
      SELECT * FROM (
        SELECT
          c.name as "Nombre", 
          TO_CHAR(COALESCE(sum(total), 0), 'FM999,999,999,999.00') as "Total", 
          TO_CHAR(COALESCE(sum(tax), 0), 'FM999,999,999,999.00') as "Itbis", 
          TO_CHAR(COALESCE(sum("netAmount"), 0), 'FM999,999,999,999.00') as "Neto", 
          TO_CHAR(COALESCE(sum(CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN "retentionTaxValue" ELSE 0 END), 0), 'FM999,999,999,999.00') as "Itbis Retenido",
          TO_CHAR(COALESCE(sum(CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN "retentionIsrValue" ELSE 0 END), 0), 'FM999,999,999,999.00') as "Isr Retenido",
          TO_CHAR(COALESCE(sum(CASE WHEN cl.id = 1 THEN "taxForOvertaking" ELSE 0 END), 0), 'FM999,999,999,999.00') as "Itbis en Servicios", 
          TO_CHAR(COALESCE(sum(CASE WHEN cl.id = 2 THEN "taxForOvertaking" ELSE 0 END), 0), 'FM999,999,999,999.00') as "Itbis en Bienes", 
          TO_CHAR(COALESCE(sum("netToPaid"), 0), 'FM999,999,999,999.00') as "Neto a Pagar" 
        FROM public."PurchasesOrExpenses" po
        JOIN public."Concepts" c ON po."conceptId" = c.id
        JOIN public."ClassificationType" cl ON c."classificationTypeId" = cl.id
        WHERE po."authorId" = ${userId} 
          AND ("issueDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
          AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')
          OR "retentionDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
          AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ'))
        GROUP BY c.name
        UNION ALL
        SELECT
          'Total General' as "Nombre",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po.total ELSE po.total END), 0), 'FM999,999,999,999.00') as "Total", 
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po.tax ELSE po.tax END), 0), 'FM999,999,999,999.00') as "Itbis", 
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po."netAmount" ELSE po."netAmount" END), 0), 'FM999,999,999,999.00') as "Neto", 
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionTaxValue" ELSE 0 END ELSE CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionTaxValue" ELSE 0 END END), 0), 'FM999,999,999,999.00') as "Itbis Retenido",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionIsrValue" ELSE 0 END ELSE CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionIsrValue" ELSE 0 END END), 0), 'FM999,999,999,999.00') as "Isr Retenido",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN cl.id = 1 THEN po."taxForOvertaking" ELSE 0 END ELSE CASE WHEN cl.id = 1 THEN po.tax ELSE 0 END END), 0), 'FM999,999,999,999.00') as "Itbis en Servicios",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN cl.id = 2 THEN po."taxForOvertaking" ELSE 0 END ELSE CASE WHEN cl.id = 2 THEN po.tax ELSE 0 END END), 0), 'FM999,999,999,999.00') as "Itbis en Bienes",
          TO_CHAR(COALESCE(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po."netToPaid" ELSE po."netToPaid" END), 0), 'FM999,999,999,999.00') as "Neto a Pagar"
        FROM public."PurchasesOrExpenses" po
        JOIN public."Concepts" c ON po."conceptId" = c.id
        JOIN public."ClassificationType" cl ON c."classificationTypeId" = cl.id
        WHERE po."authorId" = ${userId} 
          AND ("issueDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
          AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')
          OR "retentionDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
          AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ'))
      ) AS subquery
      ORDER BY "Nombre";
    `;

    res.json(result);
  } catch (error) {
    res.status(500).json({ error });
  }
});



app.get('/get-report-purchases-or-expenses', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { startDate, endDate } = req.query;
  try {
    var result = await prisma.$queryRaw`
      SELECT
        po."rncOrId" as "Rnc",
        po.ncf as "Ncf",
        COALESCE(po."ncfAffected", 'S/N') as "Ncf Afectado",
        TO_CHAR(po."issueDate", 'YYYYMMDD') as "Fecha de Emision",
        COALESCE(TO_CHAR(po."retentionDate", 'YYYYMMDD'), 'S/N') as "Fecha de Retencion",
        TO_CHAR(po.total, 'FM999,999,999,999.00') as "Total",
        TO_CHAR(po.tax, 'FM999,999,999,999.00') as "Itbis",
        TO_CHAR(po."netAmount", 'FM999,999,999,999.00') as "Neto",
        TO_CHAR(CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionTaxValue" ELSE 0 END, 'FM999,999,999,999.00') as "Itbis Retenido",
        TO_CHAR(CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionIsrValue" ELSE 0 END, 'FM999,999,999,999.00') as "Isr Retenido",
        TO_CHAR(po."netToPaid", 'FM999,999,999,999.00') as "Neto a Pagar"
      FROM public."PurchasesOrExpenses" po
      WHERE po."authorId" = ${userId} 
        AND ("issueDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
        AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')
        OR "retentionDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
        AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ'))
      UNION ALL
      SELECT
        'Total General' as "Rnc",
        '' as "Ncf",
        '' as "Ncf Afectado",
        '' as "Fecha de Emision",
        '' as "Fecha de Retencion",
        TO_CHAR(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po.total ELSE po.total END), 'FM999,999,999,999.00') as "Total",
        TO_CHAR(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po.tax ELSE po.tax END), 'FM999,999,999,999.00') as "Itbis",
        TO_CHAR(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po."netAmount" ELSE po."netAmount" END), 'FM999,999,999,999.00') as "Neto",
        TO_CHAR(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionTaxValue" ELSE 0 END ELSE CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionTaxValue" ELSE 0 END END), 'FM999,999,999,999.00') as "Itbis Retenido",
        TO_CHAR(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionIsrValue" ELSE 0 END ELSE CASE WHEN EXTRACT(MONTH FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(MONTH FROM po."retentionDate") AND EXTRACT(YEAR FROM TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')) = EXTRACT(YEAR FROM po."retentionDate") THEN po."retentionIsrValue" ELSE 0 END END), 'FM999,999,999,999.00') as "Isr Retenido",
        TO_CHAR(sum(CASE WHEN po."ncfsTypesId" IN ('34') THEN -po."netToPaid" ELSE po."netToPaid" END), 'FM999,999,999,999.00') as "Neto a Pagar"
      FROM public."PurchasesOrExpenses" po
      WHERE po."authorId" = ${userId} 
        AND ("issueDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
        AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ')
        OR "retentionDate" BETWEEN TO_TIMESTAMP(${startDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ') 
        AND TO_TIMESTAMP(${endDate}, 'YYYY-MM-DD"T"HH24:MI:SS.MSZ'))
    `;

    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

app.get('/get-list-purchases-periods', async (req, res) => {
  const userId = req.headers['x-user-id'];
  try {
    var result = await prisma.$queryRaw`
      SELECT DISTINCT * FROM (
        SELECT 
          TO_CHAR("issueDate", 'YYYYMM') as "Periodo",
          TO_CHAR(DATE_TRUNC('month', "issueDate"), 'YYYY-MM-DD"T"00:00:00.000Z') as "Fecha"
        FROM public."PurchasesOrExpenses" po
        WHERE po."authorId" = ${userId}
        GROUP BY TO_CHAR("issueDate", 'YYYYMM'), DATE_TRUNC('month', "issueDate")
        UNION ALL
        SELECT 
          TO_CHAR("retentionDate", 'YYYYMM') as "Periodo",
          TO_CHAR(DATE_TRUNC('month', "retentionDate"), 'YYYY-MM-DD"T"00:00:00.000Z') as "Fecha"
        FROM public."PurchasesOrExpenses" po
        WHERE po."authorId" = ${userId}
        GROUP BY TO_CHAR("retentionDate", 'YYYYMM'), DATE_TRUNC('month', "retentionDate")
      ) AS periods
      WHERE "Periodo" IS NOT NULL
      ORDER BY "Periodo" DESC
    `;

    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error });
  }
});

app.get('/check-exist-user', async (req, res) => {
  let { username, email } = req.query;

  try {

    let u1 = await prisma.users.findFirst({
      where: {

        username: {
          equals: username as string
        },

      }
    })

    let r;

    if (email) {
      u1 = await prisma.users.findFirst({
        where: {

          email: {
            equals: email as string
          },

        }
      });


      r = await prisma.requests.findFirst({
        where: {

          email: {
            equals: email as string
          },

        }
      });
    }




    if (u1 || r) {
      throw 'EL USUARIO YA ESTA REGISTRADO';
    }

    res.json({
      exist: false,
      message: 'EL USUARIO NO EXISTE'
    })

  } catch (error) {
    res.status(500).json({
      error
    })
  }
})

app.post('/send-verification', async (req, res) => {
  const { email } = req.body;
  let max = Number(process.env.MAX_CODE_LENGTH); // Aumenta el rango de códigos
  let code = Math.floor(Math.random() * max);

  try {
    var verification = await prisma.emailVerifications.findFirst({
      where: { email }
    });

    var date = new Date();
    var expired = false;

    if (verification) {
      expired = date.getTime() > verification.expirationDate!.getTime();
    }

    if (!verification || expired) {
      date.setHours(date.getHours() + 1);
      verification = await prisma.emailVerifications.create({
        data: {
          email,
          code: code.toString(),
          expirationDate: date
        }
      });

      await sendEmail({
        to: email,
        subject: 'FORM 606 ELECTRONIC SCAN - CODIGO DE VERIFICACION',
        text: '',
        html: `<h4>Tu codigo de verificacion es el siguiente:</h4><h4>${code}</h4><p>y tiene una duracion de una 1 hora</p>`
      });
    }

    res.json(verification);
  } catch (error) {
    res.status(500).json({ error });
  }
});

app.post('/check-verification', async (req, res) => {
  const { email, code } = req.body;
  try {
    var verification = await prisma.emailVerifications.update({ where: { email, code: { equals: code as string } }, data: { isVerify: true } });

    res.json(verification);
  } catch (error) {
    res.status(500).json({ error: 'CODIGO NO VALIDO' })
  }
})

app.post('/send-recovery-email', async (req, res) => {
  const { username } = req.body;
  try {
    const salt = Number(process.env.PASSWORD_SALT);
    const password = passwordGenerator(10);
    const newPassword = await hash(password, salt);
    let user = await prisma.users.findFirst({
      where: {
        username: {
          equals: username as string
        }
      }
    });

    if (user) {
      await prisma.users.update({
        where: {
          id: user?.id
        },
        data: {
          password: newPassword as string,
          passwordChangeMode: true
        }
      });

      await sendEmail({
        to: user.email,
        subject: 'FORM 606 ELECTRONIC SCAN - CAMBIO DE CONTRASEÑA',
        html: `<h4>USUARIO: ${user.username}</h4><h4>CONTRASEÑA TEMPORAL: ${password}</h4>`,
        text: ''
      })
      res.json({
        message: 'SE ENVIO EL CORREO DE RECUPERACION'
      })
    } else {
      res.status(404).json({ error: 'EL USUARIO NO EXISTE' })
    }
  } catch (error) {
    res.status(500).json({ error })
  }
})